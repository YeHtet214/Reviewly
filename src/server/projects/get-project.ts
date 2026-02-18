import { type ProjectStatus } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";

export type ProjectDetail = {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    dueAt: Date | null;
    createdAt: Date;
    agencyId: string;
};

export type GetProjectResult =
    | { ok: true; project: ProjectDetail }
    | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" };

export async function getProject(
    projectId: string,
    userId: string,
): Promise<GetProjectResult> {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                dueAt: true,
                createdAt: true,
                agencyId: true,
            },
        });

        if (!project) {
            return { ok: false, error: "Project not found.", code: "NOT_FOUND" };
        }

        const membership = await prisma.membership.findFirst({
            where: { userId, agencyId: project.agencyId },
            select: { id: true },
        });

        if (!membership) {
            return {
                ok: false,
                error: "You do not have access to this project.",
                code: "FORBIDDEN",
            };
        }

        return { ok: true, project };
    } catch (error) {
        console.error("getProject: unable to fetch project", {
            error,
            projectId,
            userId,
        });
        return { ok: false, error: "Unable to load project.", code: "NOT_FOUND" };
    }
}
