"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/src/lib/auth";
import { createProjectSchema, type CreateProjectInput } from "@/src/server/validation/projects";
import { createProject } from "@/src/server/projects/create-project";

export type CreateProjectFieldErrors = Partial<
    Record<keyof CreateProjectInput, string[]>
>;

export type CreateProjectActionResult =
    | { ok: true }
    | { ok: false; fieldErrors?: CreateProjectFieldErrors; formError?: string };

export async function createProjectAction(
    formData: FormData,
): Promise<CreateProjectActionResult> {
    const raw = {
        name: String(formData.get("name") || ""),
        description: String(formData.get("description") || ""),
        dueAt: String(formData.get("dueAt") || ""),
        status: String(formData.get("status") || ""),
    };

    const parsed = createProjectSchema.safeParse(raw);
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
        console.error("createProjectAction: unable to get session", { error });
        return {
            ok: false,
            formError: "You must be signed in to create a project.",
        };
    }

    if (!session?.user?.id) {
        return {
            ok: false,
            formError: "You must be signed in to create a project.",
        };
    }

    const result = await createProject(parsed.data, session.user.id);

    if (!result.ok) {
        return { ok: false, formError: result.error };
    }

    revalidatePath("/dashboard/projects");
    redirect("/dashboard/projects");
}
