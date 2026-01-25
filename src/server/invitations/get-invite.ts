import prisma from "@/src/lib/prisma";
import { InviteErrorCode } from "./errors";
import { hashInviteToken } from "./token";

type InvitationRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.invitation.findUnique>>
>;

export type GetValidInvitationResult =
  | { ok: true; invitation: InvitationRecord }
  | { ok: false; code: InviteErrorCode };

export async function getValidInvitation(
  token: string,
): Promise<GetValidInvitationResult> {
  const tokenHash = hashInviteToken(token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return { ok: false, code: InviteErrorCode.NOT_FOUND };
  }

  if (invitation.expiresAt < new Date()) {
    return { ok: false, code: InviteErrorCode.EXPIRED };
  }

  if (invitation.consumedAt) {
    return { ok: false, code: InviteErrorCode.CONSUMED };
  }

  return { ok: true, invitation };
}
