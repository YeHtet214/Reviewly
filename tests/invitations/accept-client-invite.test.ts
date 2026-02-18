import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/src/server/invitations/token";
import {
  generateClientToken,
  hashClientToken,
} from "@/src/server/client-auth/token";

let dbAvailable: boolean | null = null;

async function ensureDbAvailable() {
  if (dbAvailable !== null) return dbAvailable;
  try {
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

async function resetDb() {
  await prisma.clientSession.deleteMany();
  await prisma.clientProjectAccess.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.approvalItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
}

async function createAgency() {
  return prisma.agency.create({ data: { name: `Agency-${Math.random().toString(36).slice(2)}` } });
}

async function createUser(agencyId: string) {
  const user = await prisma.user.create({
    data: {
      name: "Owner",
      email: `owner-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  await prisma.membership.create({ data: { userId: user.id, agencyId, role: "OWNER" } });
  return user;
}

async function createProject(agencyId: string, userId: string) {
  return prisma.project.create({
    data: {
      agencyId,
      name: `Project-${Math.random().toString(36).slice(2)}`,
      description: "Test project",
      status: "ACTIVE",
      createdByUserId: userId,
    },
  });
}

// Simulate the accept-invite logic (extracted from the route handler for testability)
async function acceptClientInvite(token: string) {
  const tokenHash = hashInviteToken(token);
  const now = new Date();

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: { id: true, type: true, email: true, projectId: true, invitedByUserId: true, expiresAt: true, consumedAt: true },
  });

  if (!invitation) return { ok: false as const, code: "NOT_FOUND" };
  if (invitation.type !== "CLIENT") return { ok: false as const, code: "INVALID" };
  if (invitation.expiresAt < now) return { ok: false as const, code: "EXPIRED" };
  if (invitation.consumedAt !== null) return { ok: false as const, code: "CONSUMED" };
  if (!invitation.projectId) return { ok: false as const, code: "INVALID" };

  const { email, projectId, invitedByUserId } = invitation;

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.upsert({
      where: { email },
      create: { email },
      update: {},
      select: { id: true },
    });

    const existingAccess = await tx.clientProjectAccess.findUnique({
      where: { clientId_projectId: { clientId: client.id, projectId } },
      select: { id: true, revokedAt: true },
    });

    if (existingAccess) {
      if (existingAccess.revokedAt !== null) {
        await tx.clientProjectAccess.update({
          where: { id: existingAccess.id },
          data: { revokedAt: null, invitedAt: now, invitedByUserId: invitedByUserId ?? null },
        });
      }
    } else {
      await tx.clientProjectAccess.create({
        data: { clientId: client.id, projectId, invitedAt: now, invitedByUserId: invitedByUserId ?? null },
      });
    }

    await tx.invitation.update({ where: { id: invitation.id }, data: { consumedAt: now } });

    const rawSessionToken = generateClientToken();
    const sessionTokenHash = hashClientToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await tx.clientSession.create({ data: { clientId: client.id, tokenHash: sessionTokenHash, expiresAt } });

    return { clientId: client.id };
  });

  return { ok: true as const, clientId: result.clientId, projectId };
}

describe("acceptClientInvite", () => {
  beforeEach(async (t) => {
    if (!(await ensureDbAvailable())) {
      t.skip("Database not available");
      return;
    }
    await resetDb();
  });
  after(async () => {
    await prisma.$disconnect();
    dbAvailable = null;
  });

  it("creates client, access, and session on first accept", async () => {
    const agency = await createAgency();
    const user = await createUser(agency.id);
    const project = await createProject(agency.id, user.id);
    const token = generateInviteToken();

    await prisma.invitation.create({
      data: {
        type: "CLIENT",
        email: "client@example.com",
        tokenHash: hashInviteToken(token),
        projectId: project.id,
        invitedByUserId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const result = await acceptClientInvite(token);
    assert.equal(result.ok, true);

    const client = await prisma.client.findUnique({ where: { email: "client@example.com" } });
    assert.ok(client);

    const access = await prisma.clientProjectAccess.findFirst({
      where: { clientId: client.id, projectId: project.id, revokedAt: null },
    });
    assert.ok(access);

    const session = await prisma.clientSession.findFirst({ where: { clientId: client.id } });
    assert.ok(session);

    const invite = await prisma.invitation.findFirst({ where: { tokenHash: hashInviteToken(token) } });
    assert.ok(invite?.consumedAt);
  });

  it("returns CONSUMED on second accept", async () => {
    const agency = await createAgency();
    const user = await createUser(agency.id);
    const project = await createProject(agency.id, user.id);
    const token = generateInviteToken();

    await prisma.invitation.create({
      data: {
        type: "CLIENT",
        email: "client2@example.com",
        tokenHash: hashInviteToken(token),
        projectId: project.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const first = await acceptClientInvite(token);
    assert.equal(first.ok, true);

    const second = await acceptClientInvite(token);
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.code, "CONSUMED");
  });

  it("returns EXPIRED for expired token", async () => {
    const agency = await createAgency();
    const user = await createUser(agency.id);
    const project = await createProject(agency.id, user.id);
    const token = generateInviteToken();

    await prisma.invitation.create({
      data: {
        type: "CLIENT",
        email: "client3@example.com",
        tokenHash: hashInviteToken(token),
        projectId: project.id,
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    const result = await acceptClientInvite(token);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "EXPIRED");
  });

  it("restores revoked access on re-invite", async () => {
    const agency = await createAgency();
    const user = await createUser(agency.id);
    const project = await createProject(agency.id, user.id);

    // Create client with revoked access
    const client = await prisma.client.create({ data: { email: "client4@example.com" } });
    await prisma.clientProjectAccess.create({
      data: { clientId: client.id, projectId: project.id, revokedAt: new Date() },
    });

    const token = generateInviteToken();
    await prisma.invitation.create({
      data: {
        type: "CLIENT",
        email: "client4@example.com",
        tokenHash: hashInviteToken(token),
        projectId: project.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const result = await acceptClientInvite(token);
    assert.equal(result.ok, true);

    const access = await prisma.clientProjectAccess.findFirst({
      where: { clientId: client.id, projectId: project.id },
    });
    assert.equal(access?.revokedAt, null);
  });
});
