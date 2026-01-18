"use server";

import { auth } from "@/src/lib/auth";
import { signupOwnerSchema } from "@/src/server/validation/auth";
import {
  SignupOwnerError,
  signupOwner,
} from "@/src/server/services/signup-owner";
import { createAuthSession } from "@/src/server/auth-session/create-session";
import { type SignupActionResult } from "@/src/types/auth";

const DEFAULT_REDIRECT = "/";

export async function signupOwnerAction(
  formData: FormData,
): Promise<SignupActionResult> {
  const raw = {
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    agencyName: String(formData.get("agencyName") || ""),
  };

  const parsed = signupOwnerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { userId } = await signupOwner(parsed.data);
    const authContext = await auth.$context;
    const passwordHash = await authContext.password.hash(parsed.data.password);

    await authContext.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: passwordHash,
    });

    await createAuthSession({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    return { ok: true, redirectTo: DEFAULT_REDIRECT };
  } catch (error) {
    if (error instanceof SignupOwnerError) {
      if (error.code === "ACCOUNT_EXISTS") {
        return {
          ok: false,
          formError: "Unable to create account.",
        };
      }

      if (error.code === "VALIDATION_ERROR") {
        return {
          ok: false,
          fieldErrors: error.fieldErrors,
        };
      }
    }

    throw error;
  }
}
