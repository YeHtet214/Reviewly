"use server";

import { redirect } from "next/navigation";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { InviteErrorCode } from "@/src/server/invitations/errors";

const SIGN_IN_PATH = "/sign-in";

export async function continueInviteAction(token: string) {
  const result = await getValidInvitation(token);

  if (!result.ok) {
    if (
      result.code === InviteErrorCode.NOT_FOUND ||
      result.code === InviteErrorCode.EXPIRED ||
      result.code === InviteErrorCode.CONSUMED ||
      result.code === InviteErrorCode.INVALID
    ) {
      redirect(SIGN_IN_PATH);
    }
    return;
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
