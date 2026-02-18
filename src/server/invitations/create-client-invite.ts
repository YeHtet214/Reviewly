import { InvitationType, Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { sendEmail } from "@/src/server/email/ses";
import { buildClientInviteEmail } from "@/src/server/email/templates";
import { generateInviteToken, hashInviteToken } from "./token";

const INVITE_EXPIRATION_DAYS = 7;
const INVITE_PERMISSION_ROLES = [Role.OWNER, Role.ADMIN];
const DEFAULT_BASE_URL = "http://localhost:3000";

export type CreateClientInviteInput = {
  email: string;
  projectId: string;
  inviterUserId: string;
};

export type CreateClientInviteResult =
  | { ok: true; inviteUrl: string; emailError?: string }
  | { ok: false; error: string };

function buildInviteUrl(token: string): string {
  const baseUrl = process.env.APP_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/invite/${token}`;
}

export async function createClientInvite(
  input: CreateClientInviteInput,
): Promise<CreateClientInviteResult> {
  const { email, projectId, inviterUserId } = input;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        agencyId: true,
        agency: { select: { name: true } },
      },
    });

    if (!project) {
      return { ok: false, error: "Project was not found." };
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: inviterUserId,
        agencyId: project.agencyId,
        role: { in: INVITE_PERMISSION_ROLES },
      },
      select: { id: true },
    });

    if (!membership) {
      return {
        ok: false,
        error: "You do not have permission to invite clients for this project.",
      };
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.invitation.create({
      data: {
        type: InvitationType.CLIENT,
        email,
        projectId: project.id,
        agencyId: project.agencyId,
        invitedByUserId: inviterUserId,
        expiresAt,
        tokenHash,
      },
    });

    const inviteUrl = buildInviteUrl(token);
    let emailContent: ReturnType<typeof buildClientInviteEmail>;

    try {
      emailContent = buildClientInviteEmail({
        inviteUrl,
        agencyName: project.agency?.name,
        projectName: project.name,
      });
    } catch (error) {
      console.error("createClientInvite: unable to build invite email content", {
        error,
        inviterUserId,
        projectId,
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
    console.error("createClientInvite: unable to create client invitation", {
      error,
      inviterUserId,
      projectId,
    });
    return { ok: false, error: "Unable to create invitation." };
  }
}
