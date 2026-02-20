import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { generateClientToken, hashClientToken } from "@/src/server/client-auth/token";
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
  await prisma.clientLoginLink.deleteMany();
  await prisma.clientSession.deleteMany();
  await prisma.client.deleteMany();
}

async function createClient(email: string) {
  return prisma.client.create({ data: { email } });
}

// Simulate the login callback logic
async function consumeLoginLink(token: string) {
  const tokenHash = hashClientToken(token);
  const now = new Date();

  const loginLink = await prisma.clientLoginLink.findUnique({
    where: { tokenHash },
    select: { id: true, email: true, expiresAt: true, consumedAt: true },
  });

  if (!loginLink) return { ok: false as const, code: "NOT_FOUND" };
  if (loginLink.expiresAt < now) return { ok: false as const, code: "EXPIRED" };
  if (loginLink.consumedAt !== null) return { ok: false as const, code: "CONSUMED" };

  const { email } = loginLink;

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.upsert({
      where: { email },
      create: { email },
      update: {},
      select: { id: true },
    });
    await tx.clientLoginLink.update({ where: { id: loginLink.id }, data: { consumedAt: now } });
    return { clientId: client.id };
  });

  const session = await createClientSession(result.clientId);
  return { ok: true as const, clientId: result.clientId, rawToken: session.rawToken };
}

describe("ClientLoginLink", () => {
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

  it("callback creates session and can be used to authenticate", async () => {
    const email = `loginlink-${Math.random().toString(36).slice(2)}@example.com`;
    const rawToken = generateClientToken();
    const tokenHash = hashClientToken(rawToken);

    await prisma.clientLoginLink.create({
      data: { email, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const result = await consumeLoginLink(rawToken);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    // Session should be valid
    const ctx = await getClientAuthContext(`${CLIENT_SESSION_COOKIE}=${result.rawToken}`);
    assert.ok(ctx);
    assert.equal(ctx.clientId, result.clientId);
  });

  it("callback fails on second use (CONSUMED)", async () => {
    const email = `loginlink2-${Math.random().toString(36).slice(2)}@example.com`;
    const rawToken = generateClientToken();
    const tokenHash = hashClientToken(rawToken);

    await prisma.clientLoginLink.create({
      data: { email, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    const first = await consumeLoginLink(rawToken);
    assert.equal(first.ok, true);

    const second = await consumeLoginLink(rawToken);
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.code, "CONSUMED");
  });

  it("callback fails for expired link", async () => {
    const email = `loginlink3-${Math.random().toString(36).slice(2)}@example.com`;
    const rawToken = generateClientToken();
    const tokenHash = hashClientToken(rawToken);

    await prisma.clientLoginLink.create({
      data: { email, tokenHash, expiresAt: new Date(Date.now() - 1000) }, // already expired
    });

    const result = await consumeLoginLink(rawToken);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "EXPIRED");
  });
});
