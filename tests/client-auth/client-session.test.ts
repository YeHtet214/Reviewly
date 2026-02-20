import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { getClientAuthContext, createClientSession } from "@/src/server/client-auth/session";
import { CLIENT_SESSION_COOKIE } from "@/src/server/client-auth/cookie";

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
  await prisma.client.deleteMany();
}

async function createClient(email: string) {
  return prisma.client.create({ data: { email } });
}

function makeCookieHeader(rawToken: string): string {
  return `${CLIENT_SESSION_COOKIE}=${rawToken}`;
}

describe("getClientAuthContext", () => {
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

  it("returns null when no cookie is present", async () => {
    const result = await getClientAuthContext(null);
    assert.equal(result, null);
  });

  it("returns null for an unknown token", async () => {
    const result = await getClientAuthContext(makeCookieHeader("unknowntoken123"));
    assert.equal(result, null);
  });

  it("returns clientId for a valid session", async () => {
    const client = await createClient(`valid-${Math.random().toString(36).slice(2)}@example.com`);
    const { rawToken } = await createClientSession(client.id);

    const result = await getClientAuthContext(makeCookieHeader(rawToken));
    assert.ok(result);
    assert.equal(result.clientId, client.id);
  });

  it("returns null for an expired session", async () => {
    const client = await createClient(`expired-${Math.random().toString(36).slice(2)}@example.com`);
    const { rawToken } = await createClientSession(client.id);

    // Manually expire the session
    await prisma.clientSession.updateMany({
      where: { clientId: client.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await getClientAuthContext(makeCookieHeader(rawToken));
    assert.equal(result, null);
  });

  it("returns null for a revoked session", async () => {
    const client = await createClient(`revoked-${Math.random().toString(36).slice(2)}@example.com`);
    const { rawToken } = await createClientSession(client.id);

    // Manually revoke the session
    await prisma.clientSession.updateMany({
      where: { clientId: client.id },
      data: { revokedAt: new Date() },
    });

    const result = await getClientAuthContext(makeCookieHeader(rawToken));
    assert.equal(result, null);
  });
});
