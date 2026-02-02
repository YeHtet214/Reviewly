import { InvitationType, Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { sendEmail } from "@/src/server/email/ses";
import { buildMemberInviteEmail } from "@/src/server/email/templates/member-invite";
import { generateInviteToken, hashInviteToken } from "./token";

const INVITE_EXPIRATION_DAYS = 7;
const INVITE_PERMISSION_ROLES = [Role.OWNER, Role.ADMIN];

const DEFAULT_BASE_URL = "http://localhost:3000";

export type CreateInviteInput = {
  email: string;
  role: Role;
  inviterUserId: string;
  agencyId?: string | null;
};

export type CreateInviteResult =
  | { ok: true; inviteUrl: string; emailError?: string }
  | { ok: false; error: string };

function buildInviteUrl(token: string): string {
  const baseUrl = process.env.APP_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/invite/${token}`;
}

export async function createInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const { email, role, inviterUserId, agencyId } = input;

  try {
    const membership = agencyId
      ? await prisma.membership.findFirst({
          where: {
            userId: inviterUserId,
            agencyId,
            role: { in: INVITE_PERMISSION_ROLES },
          },
          select: { agencyId: true, agency: { select: { name: true } } },
        })
      : await prisma.membership.findFirst({
          where: {
            userId: inviterUserId,
            role: { in: INVITE_PERMISSION_ROLES },
          },
          orderBy: { joinedAt: "asc" },
          select: { agencyId: true, agency: { select: { name: true } } },
        });

    if (!membership) {
      return {
        ok: false,
        error: "You do not have permission to invite members for this agency.",
      };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.invitation.create({
      data: {
        type: InvitationType.MEMBER,
        email,
        agencyId: membership.agencyId,
        role,
        invitedByUserId: inviterUserId,
        expiresAt,
        tokenHash,
      },
    });

    const inviteUrl = buildInviteUrl(token);
    let emailContent: ReturnType<typeof buildMemberInviteEmail>;

    try {
      emailContent = buildMemberInviteEmail({
        inviteUrl,
        agencyName: membership.agency?.name,
      });
    } catch (error) {
      console.error("createInvite: unable to build invite email content", {
        error,
        inviterUserId,
        agencyId,
        inviteUrl,
      });
      return {
        ok: true,
        inviteUrl,
        emailError: "Unable to generate invitation email content.",
      };
    }

    const emailResult = await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!emailResult.ok) {
      return { ok: true, inviteUrl, emailError: emailResult.error };
    }

    return { ok: true, inviteUrl };
  } catch (error) {
    console.error("createInvite: unable to create member invitation", {
      error,
      inviterUserId,
      agencyId,
    });
    return { ok: false, error: "Unable to create invitation." };
  }
}
