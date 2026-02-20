"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { acceptInvite } from "@/src/server/invitations/accept-invite";

const SIGN_IN_PATH = "/sign-in";
const SET_PASSWORD_PATH = "/set-password";
const DASHBOARD_PATH = "/";
const COMPLETE_INVITE_PATH = "/invite/complete";

export async function acceptInviteAction(token: string) {
  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    redirect(`${COMPLETE_INVITE_PATH}?error=INVALID`);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const params = new URLSearchParams({ inviteToken: normalizedToken });
    redirect(`${SIGN_IN_PATH}?${params.toString()}`);
  }

  const result = await acceptInvite({
    token: normalizedToken,
    userId: session.user.id,
  });
  if (!result.ok) {
    const params = new URLSearchParams({
      token: normalizedToken,
      error: result.code,
    });
    redirect(`${COMPLETE_INVITE_PATH}?${params.toString()}`);
  }

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: { not: null },
    },
    select: { id: true },
  });

  redirect(credentialAccount ? DASHBOARD_PATH : SET_PASSWORD_PATH);
}
