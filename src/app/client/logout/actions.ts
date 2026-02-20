"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revokeClientSession } from "@/src/server/client-auth/session";
import { CLIENT_SESSION_COOKIE, buildClearClientSessionCookieHeader } from "@/src/server/client-auth/cookie";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value ?? null;

  // Build a fake cookie header string to pass to revokeClientSession
  const cookieHeader = rawToken ? `${CLIENT_SESSION_COOKIE}=${rawToken}` : null;
  await revokeClientSession(cookieHeader);

  // Clear the cookie
  cookieStore.set(CLIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/client/login");
}
