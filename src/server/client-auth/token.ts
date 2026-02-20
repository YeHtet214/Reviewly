import crypto from "node:crypto";

const TOKEN_BYTES = 32;
const SESSION_TTL_DAYS = 30;
const LOGIN_LINK_TTL_HOURS = 1;

export function generateClientToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

const clientSessionSecret = process.env.CLIENT_SESSION_SECRET;

export function hashClientToken(token: string): string {
  if (!clientSessionSecret) {
    throw new Error("CLIENT_SESSION_SECRET environment variable is not set.");
  }
  return crypto
    .createHmac("sha256", clientSessionSecret)
    .update(token)
    .digest("hex");
}

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function loginLinkExpiresAt(): Date {
  return new Date(Date.now() + LOGIN_LINK_TTL_HOURS * 60 * 60 * 1000);
}
