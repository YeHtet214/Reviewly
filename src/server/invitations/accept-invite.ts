import { z } from "zod";
import { Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { InviteErrorCode } from "./errors";
import { getValidInvitation } from "./get-invite";

type AcceptInviteInput = {
  token: string;
  userId: string;
};

export type AcceptInviteResult =
  | { ok: true }
  | { ok: false; code: InviteErrorCode | "NOT_IMPLEMENTED"; message: string };

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
});

const DEFAULT_INVITE_ERROR_MESSAGE = "Unable to accept invitation.";
const MESSAGE_BY_CODE: Record<InviteErrorCode, string> = {
  [InviteErrorCode.NOT_FOUND]: "Invite link was not found.",
  [InviteErrorCode.EXPIRED]: "Invite link has expired.",
  [InviteErrorCode.CONSUMED]: "Invite link has already been used.",
  [InviteErrorCode.INVALID]: "Invite link is invalid.",
};

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: InviteErrorCode.INVALID,
      message: "Invalid invitation details.",
    };
  }

  const { token, userId } = parsed.data;
  const result = await getValidInvitation(token);

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: MESSAGE_BY_CODE[result.code] ?? DEFAULT_INVITE_ERROR_MESSAGE,
    };
  }

  if (result.invitation.type === "CLIENT") {
    return {
      ok: false,
      code: "NOT_IMPLEMENTED",
      message: "Client invitations are not supported yet.",
    };
  }

  if (!result.invitation.agencyId) {
    return {
      ok: false,
      code: InviteErrorCode.INVALID,
      message: "Invitation is missing an agency.",
    };
  }

  const role = result.invitation.role ?? Role.MEMBER;
  const consumedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.invitation.updateMany({
        where: { id: result.invitation.id, consumedAt: null },
        data: { consumedAt },
      });

      if (consumed.count !== 1) {
        throw new Error(InviteErrorCode.CONSUMED);
      }

      const existingMembership = await tx.membership.findFirst({
        where: {
          userId,
          agencyId: result.invitation.agencyId,
        },
        select: { id: true },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId,
            agencyId: result.invitation.agencyId,
            role,
          },
        });
      }
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === InviteErrorCode.CONSUMED) {
      return {
        ok: false,
        code: InviteErrorCode.CONSUMED,
        message: MESSAGE_BY_CODE[InviteErrorCode.CONSUMED],
      };
    }

    console.error("acceptInvite: unexpected error", {
      error,
      inviteId: result.invitation.id,
      userId,
      agencyId: result.invitation.agencyId,
      role,
      invitationType: result.invitation.type,
    });

    return {
      ok: false,
      code: InviteErrorCode.INVALID,
      message: DEFAULT_INVITE_ERROR_MESSAGE,
    };
  }
}
