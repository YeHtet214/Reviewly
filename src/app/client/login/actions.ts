"use server";

import { redirect } from "next/navigation";
import prisma from "@/src/lib/prisma";
import { sendEmail } from "@/src/server/email/ses";
import { buildClientLoginLinkEmail } from "@/src/server/email/templates";
import {
  generateClientToken,
  hashClientToken,
  loginLinkExpiresAt,
} from "@/src/server/client-auth/token";

const DEFAULT_BASE_URL = "http://localhost:3000";

function buildLoginLinkUrl(token: string): string {
  const baseUrl = process.env.APP_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/client/login/callback?token=${token}`;
}

export type RequestLoginLinkResult =
  | { ok: true }
  | { ok: false; error: string };

export async function requestLoginLinkAction(
  formData: FormData,
): Promise<RequestLoginLinkResult> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  let rawToken: string;
  try {
    rawToken = generateClientToken();
    const tokenHash = hashClientToken(rawToken);
    const expiresAt = loginLinkExpiresAt();

    await prisma.clientLoginLink.create({
      data: { email, tokenHash, expiresAt },
    });
  } catch (error) {
    console.error("requestLoginLinkAction: failed to create login link", {
      error,
      email,
    });
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const loginUrl = buildLoginLinkUrl(rawToken);
  const emailContent = buildClientLoginLinkEmail({ loginUrl });
  const emailResult = await sendEmail({
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (!emailResult.ok) {
    console.error("requestLoginLinkAction: failed to send login link email", {
      error: emailResult.error,
      email,
    });
    // Return the email error so the UI can surface it
    return {
      ok: false,
      error:
        "We couldn't send the email. Please check the address and try again.",
    };
  }

  // Redirect on success — no need to return anything the client renders
  redirect("/client/login?sent=1");
}
