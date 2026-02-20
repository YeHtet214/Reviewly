import { z } from "zod";

const titleSchema = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, "Title is required"),
);

const descriptionSchema = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().optional(),
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

export const createApprovalItemSchema = z.object({
    title: titleSchema,
    description: descriptionSchema,
    dueAt: dueAtSchema,
});

export type CreateApprovalItemInput = z.infer<typeof createApprovalItemSchema>;
