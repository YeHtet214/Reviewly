import { type NextRequest, NextResponse } from "next/server";
import { InvitationType } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { hashInviteToken } from "@/src/server/invitations/token";
import {
  createClientSession,
} from "@/src/server/client-auth/session";
import { buildClientSessionCookieHeader } from "@/src/server/client-auth/cookie";

const CLIENT_LOGIN_PATH = "/client/login";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }

  let tokenHash: string;
  try {
    tokenHash = hashInviteToken(token);
  } catch {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }

  const now = new Date();

  // Find the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      type: true,
      email: true,
      projectId: true,
      invitedByUserId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!invitation) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=NOT_FOUND`, request.url));
  }
  if (invitation.type !== InvitationType.CLIENT) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }
  if (invitation.expiresAt < now) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=EXPIRED`, request.url));
  }
  if (invitation.consumedAt !== null) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=CONSUMED`, request.url));
  }
  if (!invitation.projectId) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }

  const { email, projectId, invitedByUserId } = invitation;

  let clientId: string;
  let rawToken: string;
  let expiresAt: Date;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert client by email
      const client = await tx.client.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true },
      });

      // Upsert ClientProjectAccess — restore if revoked
      const existingAccess = await tx.clientProjectAccess.findUnique({
        where: { clientId_projectId: { clientId: client.id, projectId } },
        select: { id: true, revokedAt: true },
      });

      if (existingAccess) {
        if (existingAccess.revokedAt !== null) {
          // Restore revoked access
          await tx.clientProjectAccess.update({
            where: { id: existingAccess.id },
            data: {
              revokedAt: null,
              invitedAt: now,
              invitedByUserId: invitedByUserId ?? null,
            },
          });
        }
        // If already active, leave as-is
      } else {
        await tx.clientProjectAccess.create({
          data: {
            clientId: client.id,
            projectId,
            invitedAt: now,
            invitedByUserId: invitedByUserId ?? null,
          },
        });
      }

      // Mark invitation consumed
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { consumedAt: now },
      });

      return { clientId: client.id };
    });

    clientId = result.clientId;

    // Create session outside transaction (non-critical if it fails, but we want the error to surface)
    const session = await createClientSession(clientId);
    rawToken = session.rawToken;
    expiresAt = session.expiresAt;
  } catch (error) {
    console.error("client invite accept: transaction failed", { error, token });
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=SERVER_ERROR`, request.url));
  }

  const redirectUrl = new URL(`/client/projects/${projectId}`, request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set(
    "Set-Cookie",
    buildClientSessionCookieHeader(rawToken, expiresAt),
  );
  return response;
}
