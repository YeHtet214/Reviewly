import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { getProject } from "@/src/server/projects/get-project";
import { getApprovalItemsForInternal } from "@/src/server/approval-items/get-approval-items";
import { ApprovalStatus, ProjectStatus } from "@/prisma/generated/client";
import { submitApprovalItemAction } from "./actions";
import { CreateApprovalItemForm } from "./create-form";
import type { ApprovalItemRow } from "@/src/server/approval-items/get-approval-items";

function formatDate(date: Date | null): string {
    if (!date) return "—";
    return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function statusBadgeClass(status: ProjectStatus): string {
    switch (status) {
        case ProjectStatus.ACTIVE:
            return "badge badge-approved";
        case ProjectStatus.COMPLETED:
            return "badge badge-role";
        case ProjectStatus.ARCHIVED:
            return "badge badge-pending";
        default:
            return "badge badge-role";
    }
}

function statusLabel(status: ProjectStatus): string {
    switch (status) {
        case ProjectStatus.ACTIVE:
            return "Active";
        case ProjectStatus.COMPLETED:
            return "Completed";
        case ProjectStatus.ARCHIVED:
            return "Archived";
        default:
            return status;
    }
}

type Props = {
    params: Promise<{ projectId: string }>;
};

function approvalStatusBadgeClass(status: ApprovalStatus): string {
    switch (status) {
        case ApprovalStatus.APPROVED:
            return "badge badge-approved";
        case ApprovalStatus.PENDING:
            return "badge badge-pending";
        case ApprovalStatus.REJECTED:
            return "badge badge-overdue";
        default:
            return "badge badge-role";
    }
}

function approvalStatusLabel(status: ApprovalStatus): string {
    switch (status) {
        case ApprovalStatus.DRAFT:
            return "Draft";
        case ApprovalStatus.PENDING:
            return "Pending";
        case ApprovalStatus.APPROVED:
            return "Approved";
        case ApprovalStatus.REJECTED:
            return "Rejected";
        default:
            return status;
    }
}

async function ApprovalItemsSection({
    projectId,
    userId,
}: {
    projectId: string;
    userId: string;
}) {
    void userId; // passed for future filtering needs
    const items = await getApprovalItemsForInternal(projectId);

    return (
        <section className="stack-4">
            <h2 className="section-title">Approval items</h2>

            {/* Create form */}
            <CreateApprovalItemForm projectId={projectId} />

            {/* Items list */}
            {items.length === 0 ? (
                <div className="card">
                    <p className="muted">No approval items yet.</p>
                </div>
            ) : (
                <div className="stack-3">
                    {items.map((item: ApprovalItemRow) => (
                        <div key={item.id} className="card stack-3">
                            <div className="row">
                                <p className="section-title">{item.title}</p>
                                <span className={approvalStatusBadgeClass(item.status)}>
                                    {approvalStatusLabel(item.status)}
                                </span>
                            </div>
                            {item.description && (
                                <p className="muted">{item.description}</p>
                            )}
                            {item.dueAt && (
                                <p className="muted">Due: {formatDate(item.dueAt)}</p>
                            )}
                            {item.status === ApprovalStatus.DRAFT && (
                                <form action={submitApprovalItemAction}>
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <input type="hidden" name="projectId" value={projectId} />
                                    <button type="submit" className="btn btn-secondary">
                                        Submit for review
                                    </button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}


export default async function ProjectDetailPage({ params }: Props) {
    const { projectId } = await params;

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
        redirect("/sign-in");
    }

    const result = await getProject(projectId, session.user.id);

    if (!result.ok) {
        if (result.code === "FORBIDDEN") {
            redirect("/dashboard/projects");
        }
        notFound();
    }

    const { project } = result;

    return (
        <main className="app-container">
            <div className="stack-6">
                <header className="stack-2">
                    <h1 className="page-title">{project.name}</h1>
                    <div className="row-start">
                        <span className={statusBadgeClass(project.status)}>
                            {statusLabel(project.status)}
                        </span>
                    </div>
                </header>

                <section className="card">
                    <div className="stack-4">
                        <h2 className="section-title">Project details</h2>

                        <div className="stack-3">
                            {project.description ? (
                                <div className="stack-2">
                                    <label className="label">Description</label>
                                    <p>{project.description}</p>
                                </div>
                            ) : null}

                            <div className="stack-2">
                                <label className="label">Due date</label>
                                <p>{formatDate(project.dueAt)}</p>
                            </div>

                            <div className="stack-2">
                                <label className="label">Created</label>
                                <p>{formatDate(project.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <ApprovalItemsSection projectId={project.id} userId={session.user.id} />
            </div>
        </main>
    );
}
