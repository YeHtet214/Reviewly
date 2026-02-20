import prisma from "@/src/lib/prisma";
import { ApprovalStatus } from "@/prisma/generated/client";

export type ApprovalItemRow = {
    id: string;
    title: string;
    description: string | null;
    status: ApprovalStatus;
    dueAt: Date | null;
    createdAt: Date;
};

/** OVERDUE is not stored — it is computed at read time. */
export type ComputedStatus = ApprovalStatus | "OVERDUE";

export type ClientApprovalItemRow = ApprovalItemRow & {
    computedStatus: ComputedStatus;
};

/**
 * Fetches all approval items for a project (internal use — includes DRAFT).
 */
export async function getApprovalItemsForInternal(
    projectId: string,
): Promise<ApprovalItemRow[]> {
    return prisma.approvalItem.findMany({
        where: { projectId },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Fetches approval items for a project for the client view.
 * Excludes DRAFT items.
 * Computes OVERDUE: PENDING items with dueAt in the past.
 */
export async function getApprovalItemsForClient(
    projectId: string,
): Promise<ClientApprovalItemRow[]> {
    const now = new Date();

    const items = await prisma.approvalItem.findMany({
        where: {
            projectId,
            status: { not: ApprovalStatus.DRAFT },
        },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return items.map((item) => ({
        ...item,
        computedStatus: computeStatus(item.status, item.dueAt, now),
    }));
}

function computeStatus(
    status: ApprovalStatus,
    dueAt: Date | null,
    now: Date,
): ComputedStatus {
    if (status === ApprovalStatus.PENDING && dueAt !== null && dueAt < now) {
        return "OVERDUE";
    }
    return status;
}
