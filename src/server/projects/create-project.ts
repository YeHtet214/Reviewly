import { Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import type { CreateProjectInput } from "@/src/server/validation/projects";

export type CreateProjectResult =
    | { ok: true; project: { id: string; name: string } }
    | { ok: false; error: string };

const ALLOWED_ROLES = [Role.OWNER, Role.ADMIN];

export async function createProject(
    input: CreateProjectInput,
    userId: string,
): Promise<CreateProjectResult> {
    try {
        const membership = await prisma.membership.findFirst({
            where: {
                userId,
                role: { in: ALLOWED_ROLES },
            },
            orderBy: { joinedAt: "asc" },
            select: { agencyId: true },
        });

        if (!membership) {
            return {
                ok: false,
                error: "You do not have permission to create projects for this agency.",
            };
        }

        const project = await prisma.project.create({
            data: {
                agencyId: membership.agencyId,
                createdByUserId: userId,
                name: input.name,
                description: input.description ?? "",
                status: input.status,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dueAt: (input.dueAt ?? null) as any,
            },
            select: { id: true, name: true },
        });

        return { ok: true, project };
    } catch (error) {
        console.error("createProject: unable to create project", {
            error,
            userId,
        });
        return { ok: false, error: "Unable to create project." };
    }
}
