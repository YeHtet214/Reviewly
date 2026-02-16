import { headers } from "next/headers";
import { Role } from "@/prisma/generated/client";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import InviteClientForm from "./invite-client-form";

export default async function InviteClientPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  let projects: { id: string; name: string }[] = [];
  let loadError: string | null = null;

  if (!session?.user?.id) {
    loadError = "You must be signed in to invite a client.";
  } else {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        role: { in: [Role.OWNER, Role.ADMIN] },
      },
      orderBy: { joinedAt: "asc" },
      select: { agencyId: true },
    });

    if (!membership) {
      loadError = "You do not have permission to invite clients.";
    } else {
      projects = await prisma.project.findMany({
        where: { agencyId: membership.agencyId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      });
    }
  }

  return (
    <main className="app-container">
      <div className="stack-6">
        <header className="stack-2">
          <h1 className="page-title">Invite client</h1>
          <p className="muted">Invite a client to view a specific project.</p>
        </header>

        <section className="card">
          <InviteClientForm projects={projects} loadError={loadError} />
        </section>
      </div>
    </main>
  );
}
