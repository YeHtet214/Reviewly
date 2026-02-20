import prisma from "@/src/lib/prisma";
import { ApprovalStatus } from "@/prisma/generated/client";

export type TransitionAction = "SUBMIT" | "APPROVE" | "REJECT";
export type ActorType = "INTERNAL" | "CLIENT";

export class InvalidTransitionError extends Error {
    constructor(currentStatus: ApprovalStatus, action: TransitionAction, actorType: ActorType) {
        super(
            `Cannot perform ${action} (actor: ${actorType}) on an item with status ${currentStatus}.`,
        );
        this.name = "InvalidTransitionError";
    }
}

type TransitionResult =
    | { ok: true; newStatus: ApprovalStatus }
    | { ok: false; error: string; code: "NOT_FOUND" | "INVALID_TRANSITION" };

/**
 * Enforces the ApprovalItem state machine.
 *
 * Valid transitions:
 *   DRAFT  + SUBMIT  (INTERNAL) → PENDING
 *   PENDING + APPROVE (CLIENT)  → APPROVED
 *   PENDING + REJECT  (CLIENT)  → REJECTED
 *
 * All others are invalid and return an error.
 */
export async function transitionApprovalItem(
    itemId: string,
    action: TransitionAction,
    actorType: ActorType,
): Promise<TransitionResult> {
    const item = await prisma.approvalItem.findUnique({
        where: { id: itemId },
        select: { id: true, status: true },
    });

    if (!item) {
        return { ok: false, error: "Approval item not found.", code: "NOT_FOUND" };
    }

    const nextStatus = resolveNextStatus(item.status, action, actorType);
    if (!nextStatus) {
        return {
            ok: false,
            error: `Cannot perform ${action} (actor: ${actorType}) on an item with status ${item.status}.`,
            code: "INVALID_TRANSITION",
        };
    }

    await prisma.approvalItem.update({
        where: { id: itemId },
        data: { status: nextStatus },
    });

    return { ok: true, newStatus: nextStatus };
}

function resolveNextStatus(
    current: ApprovalStatus,
    action: TransitionAction,
    actorType: ActorType,
): ApprovalStatus | null {
    if (current === ApprovalStatus.DRAFT && action === "SUBMIT" && actorType === "INTERNAL") {
        return ApprovalStatus.PENDING;
    }
    if (current === ApprovalStatus.PENDING && action === "APPROVE" && actorType === "CLIENT") {
        return ApprovalStatus.APPROVED;
    }
    if (current === ApprovalStatus.PENDING && action === "REJECT" && actorType === "CLIENT") {
        return ApprovalStatus.REJECTED;
    }
    return null;
}
