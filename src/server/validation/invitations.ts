import { z } from "zod";
import { Role } from "@/prisma/generated/client";

const normalizedEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.trim().toLowerCase();
  },
  z.string().email("Email is invalid"),
);

const roleSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toUpperCase();
    return normalized.length ? normalized : undefined;
  },
  z.enum([Role.MEMBER, Role.ADMIN] as const).default(Role.MEMBER),
);

const optionalAgencyIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().min(1).optional(),
);

const projectIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.trim();
  },
  z.string().min(1, "Project is required"),
);

export const createInviteSchema = z.object({
  email: normalizedEmailSchema,
  role: roleSchema,
});

export const createInviteFormSchema = createInviteSchema.extend({
  agencyId: optionalAgencyIdSchema,
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const createClientInviteSchema = z.object({
  email: normalizedEmailSchema,
  projectId: projectIdSchema,
});

export type CreateClientInviteInput = z.infer<typeof createClientInviteSchema>;
