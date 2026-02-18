import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { hashClientToken } from "@/src/server/client-auth/token";
import { createClientSession } from "@/src/server/client-auth/session";
import { buildClientSessionCookieHeader } from "@/src/server/client-auth/cookie";

const CLIENT_LOGIN_PATH = "/client/login";
const CLIENT_HOME_PATH = "/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }

  let tokenHash: string;
  try {
    tokenHash = hashClientToken(token);
  } catch {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=INVALID`, request.url));
  }

  const now = new Date();

  const loginLink = await prisma.clientLoginLink.findUnique({
    where: { tokenHash },
    select: { id: true, email: true, expiresAt: true, consumedAt: true },
  });

  if (!loginLink) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=NOT_FOUND`, request.url));
  }
  if (loginLink.expiresAt < now) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=EXPIRED`, request.url));
  }
  if (loginLink.consumedAt !== null) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=CONSUMED`, request.url));
  }

  const { email } = loginLink;
  let clientId: string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert client by email
      const client = await tx.client.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true },
      });

      // Mark login link consumed
      await tx.clientLoginLink.update({
        where: { id: loginLink.id },
        data: { consumedAt: now },
      });

      return { clientId: client.id };
    });

    clientId = result.clientId;
  } catch (error) {
    console.error("client login callback: transaction failed", { error });
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?error=SERVER_ERROR`, request.url));
  }

  const { rawToken, expiresAt } = await createClientSession(clientId);

  const response = NextResponse.redirect(new URL(CLIENT_HOME_PATH, request.url));
  response.headers.set(
    "Set-Cookie",
    buildClientSessionCookieHeader(rawToken, expiresAt),
  );
  return response;
}
