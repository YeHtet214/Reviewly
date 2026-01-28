"use server";

import { redirect } from "next/navigation";
import { getValidInvitation } from "@/src/server/invitations/get-invite";

const SIGN_IN_PATH = "/sign-in";

export async function continueInviteAction(
  token: string,
): Promise<void> {
  const result = await getValidInvitation(token);

  if (!result.ok) {
    redirect(`/invite/${token}`);
  }

  const params = new URLSearchParams({
    email: result.invitation.email,
    inviteToken: token,
  });

  redirect(`${SIGN_IN_PATH}?${params.toString()}`);
}

export async function goToSignInAction() {
  redirect(SIGN_IN_PATH);
}
