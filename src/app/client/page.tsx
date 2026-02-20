import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientAuthContext } from "@/src/server/client-auth/session";
import { CLIENT_SESSION_COOKIE } from "@/src/server/client-auth/cookie";
import prisma from "@/src/lib/prisma";
import { logoutAction } from "@/src/app/client/logout/actions";
import { Button } from "@/src/components/ui/button";

export default async function ClientHomePage() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value ?? null;
  const cookieHeader = rawToken ? `${CLIENT_SESSION_COOKIE}=${rawToken}` : null;

  const ctx = await getClientAuthContext(cookieHeader);
  if (!ctx) {
    redirect("/client/login");
  }

  const accesses = await prisma.clientProjectAccess.findMany({
    where: { clientId: ctx.clientId, revokedAt: null },
    select: {
      project: {
        select: { id: true, name: true, description: true, status: true },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    select: { email: true, name: true },
  });

  return (
    <main className="app-container">
      <div className="stack-6">
        <header className="row">
          <div className="stack-2">
            <h1 className="page-title">Your Projects</h1>
            <p className="muted">{client?.email}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" className="btn-secondary">
              Log out
            </Button>
          </form>
        </header>

        {accesses.length === 0 ? (
          <section className="card">
            <div className="stack-2">
              <p className="section-title">No access yet</p>
              <p className="muted">
                You don&apos;t have access to any projects yet. Ask your agency
                to send you an invite link.
              </p>
            </div>
          </section>
        ) : (
          <div className="stack-4">
            {accesses.map(({ project }) => (
              <Link
                key={project.id}
                href={`/client/projects/${project.id}`}
                className="card row"
              >
                <div className="stack-1">
                  <p className="section-title">{project.name}</p>
                  {project.description && (
                    <p className="muted">{project.description}</p>
                  )}
                </div>
                <span className="badge badge-role">{project.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
