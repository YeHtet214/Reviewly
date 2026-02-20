"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/src/lib/auth";
import { createApprovalItem } from "@/src/server/approval-items/create-approval-item";
import { submitApprovalItem } from "@/src/server/approval-items/submit-approval-item";
import { createApprovalItemSchema } from "@/src/server/validation/approval-items";

export type CreateFormState = { error?: string };

/**
 * useActionState-compatible action — returns error state so the client
 * component can display it without a page reload.
 */
export async function createApprovalItemFormAction(
    _prev: CreateFormState,
    formData: FormData,
): Promise<CreateFormState> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
        return { error: "You must be signed in." };
    }

    const projectId = formData.get("projectId");
    if (typeof projectId !== "string" || !projectId) {
        return { error: "Missing project ID." };
    }

    const parsed = createApprovalItemSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description") || undefined,
        dueAt: formData.get("dueAt") || undefined,
    });
    if (!parsed.success) {
        return { error: parsed.error.issues.map((i) => i.message).join(", ") };
    }

    const result = await createApprovalItem(projectId, parsed.data, session.user.id);
    if (!result.ok) {
        return { error: result.error };
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return {};
}

export async function submitApprovalItemAction(formData: FormData): Promise<void> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
        console.error("submitApprovalItemAction: unauthenticated");
        return;
    }

    const itemId = formData.get("itemId");
    const projectId = formData.get("projectId");
    if (typeof itemId !== "string" || !itemId) return;
    if (typeof projectId !== "string" || !projectId) return;

    const result = await submitApprovalItem(itemId, session.user.id);
    if (!result.ok) {
        console.error("submitApprovalItemAction:", result.error);
        return;
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
}
