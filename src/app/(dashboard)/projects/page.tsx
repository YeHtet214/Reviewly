import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/src/lib/auth";
import { listProjects } from "@/src/server/projects/list-projects";
import { redirect } from "next/navigation";
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

export default async function ProjectsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
        redirect("/sign-in");
    }

    const result = await listProjects(session.user.id);

    return (
        <main className="app-container">
            <div className="stack-6">
                <header className="row">
                    <div className="stack-2">
                        <h1 className="page-title">Projects</h1>
                        <p className="muted">All projects for your agency.</p>
                    </div>
                    <Link href="/dashboard/projects/new" className="btn-primary">
                        New Project
                    </Link>
                </header>

                {!result.ok ? (
                    <section className="card">
                        <p className="error-text">{result.error}</p>
                    </section>
                ) : result.projects.length === 0 ? (
                    <section className="card">
                        <div className="stack-2">
                            <p className="muted">No projects yet.</p>
                            <Link href="/dashboard/projects/new" className="link">
                                Create your first project →
                            </Link>
                        </div>
                    </section>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Due date</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.projects.map((project) => (
                                <tr key={project.id}>
                                    <td>
                                        <Link
                                            href={`/dashboard/projects/${project.id}`}
                                            className="link"
                                        >
                                            {project.name}
                                        </Link>
                                    </td>
                                    <td>
                                        <span className={statusBadgeClass(project.status)}>
                                            {statusLabel(project.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <small>{formatDate(project.dueAt)}</small>
                                    </td>
                                    <td>
                                        <small>{formatDate(project.createdAt)}</small>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </main>
    );
}
