import { Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";

export type GetProjectsForInviteResult =
  | { ok: true; projects: { id: string; name: string }[] }
  | { ok: false; error: string };

export async function getProjectsForInvite(
  userId: string,
): Promise<GetProjectsForInviteResult> {
  try {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        role: { in: [Role.OWNER, Role.ADMIN] },
      },
      orderBy: { joinedAt: "asc" },
      select: { agencyId: true },
    });

    if (!membership) {
      return {
        ok: false,
        error: "You do not have permission to invite clients.",
      };
    }

    const projects = await prisma.project.findMany({
      where: { agencyId: membership.agencyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });

    return { ok: true, projects };
  } catch (error) {
    console.error("topProjectsForInvite: unable to get projects", {
      error,
      userId,
    });
    return { ok: false, error: "Unable to load projects." };
  }
}
