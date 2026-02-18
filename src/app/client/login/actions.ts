"use server";

import { redirect } from "next/navigation";
import prisma from "@/src/lib/prisma";
import { sendEmail } from "@/src/server/email/ses";
import { buildClientLoginLinkEmail } from "@/src/server/email/templates";
import { generateClientToken, hashClientToken, loginLinkExpiresAt } from "@/src/server/client-auth/token";

const DEFAULT_BASE_URL = "http://localhost:3000";

function buildLoginLinkUrl(token: string): string {
  const baseUrl = process.env.APP_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/client/login/callback?token=${token}`;
}

export async function requestLoginLinkAction(formData: FormData): Promise<void> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    redirect("/client/login?error=INVALID_EMAIL");
  }

  try {
    const rawToken = generateClientToken();
    const tokenHash = hashClientToken(rawToken);
    const expiresAt = loginLinkExpiresAt();

    await prisma.clientLoginLink.create({
      data: { email, tokenHash, expiresAt },
    });

    const loginUrl = buildLoginLinkUrl(rawToken);

    try {
      const emailContent = buildClientLoginLinkEmail({ loginUrl });
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error("requestLoginLinkAction: failed to send login link email", {
        emailError,
        email,
      });
      // Still redirect to success — don't leak errors
    }
  } catch (error) {
    console.error("requestLoginLinkAction: failed to create login link", {
      error,
      email,
    });
  }

  // Always redirect to success page — avoid leaking whether the email exists
  redirect("/client/login?sent=1");
}
