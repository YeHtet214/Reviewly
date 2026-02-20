import prisma from "@/src/lib/prisma";
import { transitionApprovalItem } from "./transition-approval-item";

export type SubmitApprovalItemResult =
    | { ok: true }
    | { ok: false; error: string };

/**
 * Submits a DRAFT approval item for client review (DRAFT → PENDING).
 * Requires the userId to be a member of the project's owning agency.
 */
export async function submitApprovalItem(
    itemId: string,
    userId: string,
): Promise<SubmitApprovalItemResult> {
    try {
        // Fetch item and project to check membership
        const item = await prisma.approvalItem.findUnique({
            where: { id: itemId },
            select: {
                status: true,
                project: { select: { agencyId: true } },
            },
        });

        if (!item) {
            return { ok: false, error: "Approval item not found." };
        }

        const membership = await prisma.membership.findFirst({
            where: { userId, agencyId: item.project.agencyId },
            select: { id: true },
        });

        if (!membership) {
            return { ok: false, error: "You do not have access to this project." };
        }

        const result = await transitionApprovalItem(itemId, "SUBMIT", "INTERNAL");
        if (!result.ok) {
            return { ok: false, error: result.error };
        }

        return { ok: true };
    } catch (error) {
        console.error("submitApprovalItem: failed", { error, itemId, userId });
        return { ok: false, error: "Unable to submit approval item." };
    }
}
