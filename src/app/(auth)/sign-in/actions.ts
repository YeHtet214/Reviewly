"use server";

import { APIError } from "better-call";
import { auth } from "@/src/lib/auth";
import { signInSchema } from "@/src/server/validation/auth";
import { type SignInActionResult } from "@/src/types/auth";

const DEFAULT_REDIRECT = "/";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function signInAction(
  formData: FormData,
): Promise<SignInActionResult> {
  const raw = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  };
  const inviteToken = String(formData.get("inviteToken") || "").trim();

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
    });

    const redirectTo = inviteToken
      ? `/invite/complete?token=${encodeURIComponent(inviteToken)}`
      : DEFAULT_REDIRECT;

    return { ok: true, redirectTo };
  } catch (error) {
    if (error instanceof APIError) {
      return { ok: false, formError: INVALID_CREDENTIALS_MESSAGE };
    }

    return { ok: false, formError: INVALID_CREDENTIALS_MESSAGE };
  }
}
