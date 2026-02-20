import prisma from "@/src/lib/prisma";
import { generateClientToken, hashClientToken, sessionExpiresAt } from "./token";
import { parseClientSessionCookie } from "./cookie";

export type ClientAuthContext = { clientId: string };

/**
 * Reads the client_session cookie, validates it against the DB,
 * and returns the clientId — or null if invalid/missing.
 */
export async function getClientAuthContext(
  cookieHeader: string | null,
): Promise<ClientAuthContext | null> {
  const rawToken = parseClientSessionCookie(cookieHeader);
  if (!rawToken) return null;

  let tokenHash: string;
  try {
    tokenHash = hashClientToken(rawToken);
  } catch {
    console.error("Failed to hash client token");
    return null;
  }

  const now = new Date();
  const session = await prisma.clientSession.findUnique({
    where: { tokenHash },
    select: { clientId: true, expiresAt: true, revokedAt: true },
  });

  if (!session) return null;
  if (session.expiresAt < now) return null;
  if (session.revokedAt !== null) return null;

  return { clientId: session.clientId };
}

/**
 * Creates a new ClientSession in the DB and returns the raw token + expiry.
 */
export async function createClientSession(
  clientId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateClientToken();
  const tokenHash = hashClientToken(rawToken);
  const expiresAt = sessionExpiresAt();

  await prisma.clientSession.create({
    data: { clientId, tokenHash, expiresAt },
  });

  return { rawToken, expiresAt };
}

/**
 * Revokes a client session by setting revokedAt = now.
 * Returns true if a session was found and revoked.
 */
export async function revokeClientSession(
  cookieHeader: string | null,
): Promise<boolean> {
  const rawToken = parseClientSessionCookie(cookieHeader);
  if (!rawToken) return false;

  let tokenHash: string;
  try {
    tokenHash = hashClientToken(rawToken);
  } catch {
    return false;
  }

  try {
    await prisma.clientSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}
