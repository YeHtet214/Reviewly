import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { getProject } from "@/src/server/projects/get-project";
import { ProjectStatus } from "@/prisma/generated/client";

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

                <section className="card">
                    <div className="stack-2">
                        <h2 className="section-title">Approval items</h2>
                        <p className="muted">Approval items coming next.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
