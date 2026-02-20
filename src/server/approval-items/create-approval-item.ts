import prisma from "@/src/lib/prisma";
import type { CreateApprovalItemInput } from "@/src/server/validation/approval-items";
import { ApprovalStatus } from "@/prisma/generated/client";

export type CreateApprovalItemResult =
    | { ok: true; item: { id: string; title: string } }
    | { ok: false; error: string };

/**
 * Creates an ApprovalItem with status DRAFT.
 * Requires the userId to be a member of the project's agency.
 */
export async function createApprovalItem(
    projectId: string,
    input: CreateApprovalItemInput,
    userId: string,
): Promise<CreateApprovalItemResult> {
    try {
        // Verify the project exists and user is a member of the owning agency
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { agencyId: true },
        });

        if (!project) {
            return { ok: false, error: "Project not found." };
        }

        const membership = await prisma.membership.findFirst({
            where: { userId, agencyId: project.agencyId },
            select: { id: true },
        });

        if (!membership) {
            return { ok: false, error: "You do not have access to this project." };
        }

        const item = await prisma.approvalItem.create({
            data: {
                projectId,
                title: input.title,
                description: input.description ?? null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dueAt: (input.dueAt ?? null) as any,
                status: ApprovalStatus.DRAFT,
            },
            select: { id: true, title: true },
        });

        return { ok: true, item };
    } catch (error) {
        console.error("createApprovalItem: failed", { error, projectId, userId });
        return { ok: false, error: "Unable to create approval item." };
    }
}
