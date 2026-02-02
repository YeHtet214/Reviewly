import { z } from "zod";
import { InvitationType, Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { InviteErrorCode } from "./errors";
import { hashInviteToken } from "./token";

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
  const consumedAt = new Date();
  const tokenHash = hashInviteToken(token);
  let consumedInvite: {
    id: string;
    agencyId: string | null;
    role: Role | null;
    type: InvitationType;
  } | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.updateManyAndReturn({
        where: {
          tokenHash,
          consumedAt: null,
          expiresAt: { gte: consumedAt },
          type: InvitationType.MEMBER,
          agencyId: { not: null },
        },
        data: { consumedAt },
        select: {
          id: true,
          agencyId: true,
          role: true,
          type: true,
        },
      });

      const invite = updated[0];
      if (!invite || !invite.agencyId) {
        return;
      }

      consumedInvite = invite;
      const role = invite.role ?? Role.MEMBER;

      const existingMembership = await tx.membership.findFirst({
        where: {
          userId,
          agencyId: invite.agencyId,
        },
        select: { id: true },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId,
            agencyId: invite.agencyId,
            role,
          },
        });
      }
    });

    if (consumedInvite) {
      return { ok: true };
    }

    const invite = await prisma.invitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        type: true,
        agencyId: true,
        role: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!invite) {
      return {
        ok: false,
        code: InviteErrorCode.NOT_FOUND,
        message: MESSAGE_BY_CODE[InviteErrorCode.NOT_FOUND],
      };
    }

    if (invite.expiresAt < consumedAt) {
      return {
        ok: false,
        code: InviteErrorCode.EXPIRED,
        message: MESSAGE_BY_CODE[InviteErrorCode.EXPIRED],
      };
    }

    if (invite.type === InvitationType.CLIENT) {
      return {
        ok: false,
        code: "NOT_IMPLEMENTED",
        message: "Client invitations are not supported yet.",
      };
    }

    if (!invite.agencyId) {
      return {
        ok: false,
        code: InviteErrorCode.INVALID,
        message: "Invitation is missing an agency.",
      };
    }

    if (invite.consumedAt) {
      const existingMembership = await prisma.membership.findFirst({
        where: {
          userId,
          agencyId: invite.agencyId,
        },
        select: { id: true },
      });

      if (existingMembership) {
        return { ok: true };
      }

      return {
        ok: false,
        code: InviteErrorCode.CONSUMED,
        message: MESSAGE_BY_CODE[InviteErrorCode.CONSUMED],
      };
    }

    return {
      ok: false,
      code: InviteErrorCode.INVALID,
      message: DEFAULT_INVITE_ERROR_MESSAGE,
    };
  } catch {
    return {
      ok: false,
      code: InviteErrorCode.INVALID,
      message: DEFAULT_INVITE_ERROR_MESSAGE,
    };
  }
}
