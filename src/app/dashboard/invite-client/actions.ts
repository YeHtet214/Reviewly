"use server";

import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import {
  createClientInviteSchema,
  type CreateClientInviteInput,
} from "@/src/server/validation/invitations";
import { createClientInvite } from "@/src/server/invitations/create-client-invite";
import { getProjectsForInvite } from "@/src/server/invitations/get-projects-for-invite";

export type GetAvailableProjectsResult =
  | { ok: true; projects: { id: string; name: string }[] }
  | { ok: false; error: string };

export async function getAvailableProjectsAction(): Promise<GetAvailableProjectsResult> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;

  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error("getAvailableProjectsAction: unable to get session", {
      error,
    });
    return {
      ok: false,
      error: "You must be signed in to invite a client.",
    };
  }

  if (!session?.user?.id) {
    return {
      ok: false,
      error: "You must be signed in to invite a client.",
    };
  }

  return getProjectsForInvite(session.user.id);
}


export type CreateClientInviteFieldErrors = Partial<
  Record<keyof CreateClientInviteInput, string[]>
>;

export type CreateClientInviteActionResult =
  | { ok: true; inviteUrl: string; emailError?: string }
  | { ok: false; fieldErrors?: CreateClientInviteFieldErrors; formError?: string };

export async function createClientInviteAction(
  formData: FormData,
): Promise<CreateClientInviteActionResult> {
  const raw = {
    email: String(formData.get("email") || ""),
    projectId: String(formData.get("projectId") || ""),
  };

  const parsed = createClientInviteSchema.safeParse(raw);
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
    console.error("createClientInviteAction: unable to get session", { error });
    return {
      ok: false,
      formError: "You must be signed in to invite a client.",
    };
  }

  if (!session?.user?.id) {
    return {
      ok: false,
      formError: "You must be signed in to invite a client.",
    };
  }

  try {
    const result = await createClientInvite({
      email: parsed.data.email,
      projectId: parsed.data.projectId,
      inviterUserId: session.user.id,
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
    console.error("createClientInviteAction: unexpected error", { error });
    return { ok: false, formError: "Unable to create invitation." };
  }
}
