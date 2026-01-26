import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { InviteErrorCode } from "@/src/server/invitations/errors";
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

describe("getValidInvitation", () => {
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

  it("returns invitation for a valid token", async () => {
    const token = generateInviteToken();
    const invitation = await prisma.invitation.create({
      data: {
        type: "MEMBER",
        email: "invitee@example.com",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const result = await getValidInvitation(token);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.invitation.id, invitation.id);
    }
  });

  it("returns EXPIRED for an expired token", async () => {
    const token = generateInviteToken();
    await prisma.invitation.create({
      data: {
        type: "MEMBER",
        email: "expired@example.com",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() - 1000 * 60),
      },
    });

    const result = await getValidInvitation(token);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, InviteErrorCode.EXPIRED);
    }
  });

  it("returns CONSUMED for a consumed token", async () => {
    const token = generateInviteToken();
    await prisma.invitation.create({
      data: {
        type: "MEMBER",
        email: "consumed@example.com",
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        consumedAt: new Date(),
      },
    });

    const result = await getValidInvitation(token);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, InviteErrorCode.CONSUMED);
    }
  });

  it("returns NOT_FOUND for an unknown token", async () => {
    const result = await getValidInvitation(generateInviteToken());

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, InviteErrorCode.NOT_FOUND);
    }
  });
});
