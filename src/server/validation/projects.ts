import { z } from "zod";
import { ProjectStatus } from "@/prisma/generated/client";

const nameSchema = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, "Name is required"),
);

const descriptionSchema = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().optional().default(""),
);

const dueAtSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? trimmed : date;
    },
    z.date({ error: "Due date must be a valid date" }).optional(),
);

const statusSchema = z.preprocess(
    (value) => {
        if (typeof value !== "string") return value;
        const normalized = value.trim().toUpperCase();
        return normalized.length ? normalized : undefined;
    },
    z
        .enum([
            ProjectStatus.ACTIVE,
            ProjectStatus.COMPLETED,
            ProjectStatus.ARCHIVED,
        ] as const)
        .default(ProjectStatus.ACTIVE),
);

export const createProjectSchema = z.object({
    name: nameSchema,
    description: descriptionSchema,
    dueAt: dueAtSchema,
    status: statusSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
