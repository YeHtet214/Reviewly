import { Role, type ProjectStatus } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";

export type ProjectListItem = {
    id: string;
    name: string;
    status: ProjectStatus;
    dueAt: Date | null;
    createdAt: Date;
};

export type ListProjectsResult =
    | { ok: true; projects: ProjectListItem[] }
    | { ok: false; error: string };

export async function listProjects(userId: string): Promise<ListProjectsResult> {
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
                error: "You do not have permission to view projects for this agency.",
            };
        }

        const projects = await prisma.project.findMany({
            where: { agencyId: membership.agencyId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                status: true,
                dueAt: true,
                createdAt: true,
            },
        });

        return { ok: true, projects };
    } catch (error) {
        console.error("listProjects: unable to list projects", { error, userId });
        return { ok: false, error: "Unable to load projects." };
    }
}
