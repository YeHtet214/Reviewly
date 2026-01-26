"use server";

import { redirect } from "next/navigation";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { InviteErrorCode } from "@/src/server/invitations/errors";

const SIGN_IN_PATH = "/sign-in";
const DEFAULT_INVITE_ERROR_MESSAGE = "Invite link is invalid or expired.";

type ContinueInviteActionResult =
  | { ok: true }
  | { ok: false; code: InviteErrorCode; message: string };

export async function continueInviteAction(
  token: string,
): Promise<ContinueInviteActionResult> {
  const result = await getValidInvitation(token);

  if (!result.ok) {
    const messageByCode: Record<InviteErrorCode, string> = {
      [InviteErrorCode.NOT_FOUND]: "Invite link was not found.",
      [InviteErrorCode.EXPIRED]: "Invite link has expired.",
      [InviteErrorCode.CONSUMED]: "Invite link has already been used.",
      [InviteErrorCode.INVALID]: "Invite link is invalid.",
    };

    return {
      ok: false,
      code: result.code,
      message: messageByCode[result.code] ?? DEFAULT_INVITE_ERROR_MESSAGE,
    };
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
