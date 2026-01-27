import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { InviteErrorCode } from "@/src/server/invitations/errors";
import { acceptInvite } from "@/src/server/invitations/accept-invite";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/src/server/invitations/token";

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
  await prisma.invitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser() {
  return prisma.user.create({
    data: {
      name: "Invitee",
      email: `invitee-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function createAgency() {
  return prisma.agency.create({
    data: {
      name: `Agency ${Math.random().toString(36).slice(2)}`,
    },
  });
}

describe("acceptInvite", () => {
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

  it("accepts a member invite, creates membership, and consumes the invite", async () => {
    const user = await createUser();
    const agency = await createAgency();
    const token = generateInviteToken();

    const invitation = await prisma.invitation.create({
      data: {
        type: "MEMBER",
        email: user.email,
        tokenHash: hashInviteToken(token),
        agencyId: agency.id,
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const result = await acceptInvite({ token, userId: user.id });

    assert.equal(result.ok, true);

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, agencyId: agency.id },
    });
    assert.ok(membership);

    const updatedInvite = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    assert.ok(updatedInvite?.consumedAt);
  });

  it("prevents reuse of a consumed invite", async () => {
    const user = await createUser();
    const agency = await createAgency();
    const token = generateInviteToken();

    await prisma.invitation.create({
      data: {
        type: "MEMBER",
        email: user.email,
        tokenHash: hashInviteToken(token),
        agencyId: agency.id,
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const first = await acceptInvite({ token, userId: user.id });
    assert.equal(first.ok, true);

    const second = await acceptInvite({ token, userId: user.id });
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.code, InviteErrorCode.CONSUMED);
    }
  });

  it("returns NOT_IMPLEMENTED for client invites without consuming them", async () => {
    const user = await createUser();
    const token = generateInviteToken();

    const invitation = await prisma.invitation.create({
      data: {
        type: "CLIENT",
        email: user.email,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const result = await acceptInvite({ token, userId: user.id });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "NOT_IMPLEMENTED");
    }

    const updatedInvite = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    assert.equal(updatedInvite?.consumedAt, null);
  });
});
