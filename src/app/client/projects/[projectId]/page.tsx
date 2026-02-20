import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getClientAuthContext } from "@/src/server/client-auth/session";
import { requireClientProjectAccess } from "@/src/server/client-auth/access";
import { CLIENT_SESSION_COOKIE } from "@/src/server/client-auth/cookie";
import prisma from "@/src/lib/prisma";
import { logoutAction } from "@/src/app/client/logout/actions";
import { Button } from "@/src/components/ui/button";
import { ApprovalStatus } from "@/prisma/generated/client";
import { approveItemAction, rejectItemAction } from "./actions";
import { getApprovalItemsForClient } from "@/src/server/approval-items/get-approval-items";
import type { ComputedStatus } from "@/src/server/approval-items/get-approval-items";

function statusBadgeClass(status: ComputedStatus): string {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return "badge badge-approved";
    case ApprovalStatus.PENDING:
      return "badge badge-pending";
    case ApprovalStatus.REJECTED:
      return "badge badge-overdue";
    case "OVERDUE":
      return "badge badge-overdue";
    default:
      return "badge badge-role";
  }
}

function statusLabel(status: ComputedStatus): string {
  switch (status) {
    case ApprovalStatus.PENDING:
      return "Pending";
    case ApprovalStatus.APPROVED:
      return "Approved";
    case ApprovalStatus.REJECTED:
      return "Rejected";
    case "OVERDUE":
      return "Overdue";
    default:
      return String(status);
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ClientProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value ?? null;
  const cookieHeader = rawToken ? `${CLIENT_SESSION_COOKIE}=${rawToken}` : null;

  const ctx = await getClientAuthContext(cookieHeader);
  if (!ctx) {
    redirect("/client/login");
  }

  const hasAccess = await requireClientProjectAccess(ctx.clientId, projectId);
  if (!hasAccess) {
    return (
      <main className="app-container">
        <div className="stack-6">
          <header className="row">
            <h1 className="page-title">Access denied</h1>
            <form action={logoutAction}>
              <Button type="submit" className="btn-secondary">
                Log out
              </Button>
            </form>
          </header>
          <section className="card">
            <div className="stack-2">
              <p className="section-title">No access</p>
              <p className="muted">
                You don&apos;t have access to this project, or your access has
                been revoked.
              </p>
              <Link href="/client" className="link">
                ← Back to your projects
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      dueAt: true,
      createdAt: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch approval items — DRAFT excluded, OVERDUE computed
  const approvalItems = await getApprovalItemsForClient(projectId);

  return (
    <main className="app-container">
      <div className="stack-6">
        <header className="row">
          <div className="stack-2">
            <Link href="/client" className="muted link">
              ← Your projects
            </Link>
            <h1 className="page-title">{project.name}</h1>
            {project.description && (
              <p className="muted">{project.description}</p>
            )}
          </div>
          <form action={logoutAction}>
            <Button type="submit" className="btn-secondary">
              Log out
            </Button>
          </form>
        </header>

        <section className="stack-4">
          <h2 className="section-title">Approval items</h2>
          {approvalItems.length === 0 ? (
            <div className="card">
              <p className="muted">No approval items pending your review.</p>
            </div>
          ) : (
            <div className="stack-3">
                {approvalItems.map((item) => {
                  const isPendingOrOverdue =
                    item.computedStatus === ApprovalStatus.PENDING ||
                    item.computedStatus === "OVERDUE";

                  return (
                    <div key={item.id} className="card stack-3">
                      <div className="row">
                        <p className="section-title">{item.title}</p>
                      <span className={statusBadgeClass(item.computedStatus)}>
                        {statusLabel(item.computedStatus)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="muted">{item.description}</p>
                    )}
                    {item.dueAt && (
                      <p className="muted">Due: {formatDate(item.dueAt)}</p>
                    )}
                    {isPendingOrOverdue && (
                      <div className="row-start">
                        <form action={approveItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" className="btn btn-primary">
                            Approve
                          </button>
                        </form>
                        <form action={rejectItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" className="btn btn-secondary">
                            Reject
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
