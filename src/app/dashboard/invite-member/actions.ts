"use server";

import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import {
  createInviteFormSchema,
  type CreateInviteInput,
} from "@/src/server/validation/invitations";
import { createInvite } from "@/src/server/invitations/create-invite";

export type CreateInviteFieldErrors = Partial<
  Record<keyof CreateInviteInput, string[]>
>;

export type CreateInviteActionResult =
  | { ok: true; inviteUrl: string; emailError?: string }
  | { ok: false; fieldErrors?: CreateInviteFieldErrors; formError?: string };

export async function createInviteAction(
  formData: FormData,
): Promise<CreateInviteActionResult> {
  const raw = {
    email: String(formData.get("email") || ""),
    role: String(formData.get("role") || ""),
    agencyId: String(formData.get("agencyId") || ""),
  };

  const parsed = createInviteFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error("createInviteAction: unable to get session", { error });
    return {
      ok: false,
      formError: "You must be signed in to invite a member.",
    };
  }

  if (!session?.user?.id) {
    return {
      ok: false,
      formError: "You must be signed in to invite a member.",
    };
  }

  try {
    const result = await createInvite({
      email: parsed.data.email,
      role: parsed.data.role,
      inviterUserId: session.user.id,
      agencyId: parsed.data.agencyId ?? null,
    });

    if (!result.ok) {
      return { ok: false, formError: result.error };
    }

    return {
      ok: true,
      inviteUrl: result.inviteUrl,
      emailError: result.emailError,
    };
  } catch (error) {
    console.error("createInviteAction: unexpected error", { error });
    return { ok: false, formError: "Unable to create invitation." };
  }
}
