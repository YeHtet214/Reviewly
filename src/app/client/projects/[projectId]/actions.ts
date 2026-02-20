"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getClientAuthContext } from "@/src/server/client-auth/session";
import { requireClientProjectAccess } from "@/src/server/client-auth/access";
import { CLIENT_SESSION_COOKIE } from "@/src/server/client-auth/cookie";
import { transitionApprovalItem } from "@/src/server/approval-items/transition-approval-item";
import prisma from "@/src/lib/prisma";

async function getClientContext(projectId: string): Promise<
    | { ok: true; clientId: string }
    | { ok: false; error: string }
> {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value ?? null;
    const cookieHeader = rawToken ? `${CLIENT_SESSION_COOKIE}=${rawToken}` : null;

    const ctx = await getClientAuthContext(cookieHeader);
    if (!ctx) {
        return { ok: false, error: "Not authenticated." };
    }

    const hasAccess = await requireClientProjectAccess(ctx.clientId, projectId);
    if (!hasAccess) {
        return { ok: false, error: "Access denied." };
    }

    return { ok: true, clientId: ctx.clientId };
}

async function getItemProjectId(itemId: string): Promise<string | null> {
    const item = await prisma.approvalItem.findUnique({
        where: { id: itemId },
        select: { projectId: true },
    });
    return item?.projectId ?? null;
}

export async function approveItemAction(formData: FormData): Promise<void> {
    const itemId = formData.get("itemId");
    if (typeof itemId !== "string" || !itemId) return;

    const projectId = await getItemProjectId(itemId);
    if (!projectId) {
        console.error("approveItemAction: approval item not found", { itemId });
        return;
    }

    const ctx = await getClientContext(projectId);
    if (!ctx.ok) {
        console.error("approveItemAction:", ctx.error);
        return;
    }

    const result = await transitionApprovalItem(itemId, "APPROVE", "CLIENT");
    if (!result.ok) {
        console.error("approveItemAction:", result.error);
        return;
    }

    revalidatePath(`/client/projects/${projectId}`);
}

export async function rejectItemAction(formData: FormData): Promise<void> {
    const itemId = formData.get("itemId");
    if (typeof itemId !== "string" || !itemId) return;

    const projectId = await getItemProjectId(itemId);
    if (!projectId) {
        console.error("rejectItemAction: approval item not found", { itemId });
        return;
    }

    const ctx = await getClientContext(projectId);
    if (!ctx.ok) {
        console.error("rejectItemAction:", ctx.error);
        return;
    }

    const result = await transitionApprovalItem(itemId, "REJECT", "CLIENT");
    if (!result.ok) {
        console.error("rejectItemAction:", result.error);
        return;
    }

    revalidatePath(`/client/projects/${projectId}`);
}
