export const CLIENT_SESSION_COOKIE = "client_session";

/**
 * Returns the Set-Cookie header string for the client session cookie.
 */
export function buildClientSessionCookieHeader(
  rawToken: string,
  expiresAt: Date,
): string {
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CLIENT_SESSION_COOKIE}=${rawToken}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Returns the Set-Cookie header string that clears the client session cookie.
 */
export function buildClearClientSessionCookieHeader(): string {
  return `${CLIENT_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * Parses the client_session raw token from a Cookie header string.
 */
export function parseClientSessionCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name.trim() === CLIENT_SESSION_COOKIE) {
      return rest.join("=").trim() || null;
    }
  }
  return null;
}
