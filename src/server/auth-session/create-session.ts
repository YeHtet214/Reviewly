import { auth } from "@/src/lib/auth";
import { parseSetCookieHeader } from "better-auth/cookies";
import { cookies } from "next/headers";

type CreateSessionInput = {
  email: string;
  password: string;
};

function isRequestScopeError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("`cookies` was called outside a request scope.")
  );
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function createAuthSession({ email, password }: CreateSessionInput) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });

  const setCookieHeader = headers.get("set-cookie");
  if (!setCookieHeader) return;

  let cookieStore: ReturnType<typeof cookies> | null = null;
  try {
    cookieStore = cookies();
  } catch (error) {
    if (isRequestScopeError(error)) return;
    throw error;
  }

  parseSetCookieHeader(setCookieHeader).forEach((value, name) => {
    cookieStore?.set(name, decodeCookieValue(value.value), {
      domain: value.domain,
      path: value.path,
      httpOnly: value.httponly,
      secure: value.secure,
      sameSite: value.samesite,
      expires: value.expires,
      maxAge: value["max-age"],
    });
  });
}
