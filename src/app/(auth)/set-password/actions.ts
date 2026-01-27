"use server";

import { APIError } from "better-call";
import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { setPasswordSchema } from "@/src/server/validation/auth";

const DASHBOARD_PATH = "/";

type SetPasswordFieldErrors = Partial<
  Record<"password" | "confirmPassword", string[]>
>;

export type SetPasswordActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; fieldErrors?: SetPasswordFieldErrors; formError?: string };

type SetPasswordStatusResult =
  | { ok: true }
  | { ok: false; redirectTo: string };

export async function getSetPasswordStatusAction(): Promise<SetPasswordStatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, redirectTo: "/sign-in" };
  }

  const existingCredential = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: { not: null },
    },
    select: { id: true },
  });

  if (existingCredential) {
    return { ok: false, redirectTo: DASHBOARD_PATH };
  }

  return { ok: true };
}

export async function setPasswordAction(
  formData: FormData,
): Promise<SetPasswordActionResult> {
  const raw = {
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
  };

  const parsed = setPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      ok: false,
      formError: "You must be signed in to set a password.",
    };
  }

  const existingCredential = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: { not: null },
    },
    select: { id: true },
  });

  if (existingCredential) {
    return {
      ok: true,
      redirectTo: DASHBOARD_PATH,
    };
  }

  try {
    await auth.api.setPassword({
      body: {
        newPassword: parsed.data.password,
      },
    });

    return { ok: true, redirectTo: DASHBOARD_PATH };
  } catch (error) {
    if (error instanceof APIError) {
      const message = error.message || "Unable to set password.";
      if (message.toLowerCase().includes("already has a password")) {
        return { ok: false, formError: "Password is already set." };
      }
      return { ok: false, formError: message };
    }

    return { ok: false, formError: "Unable to set password." };
  }
}
