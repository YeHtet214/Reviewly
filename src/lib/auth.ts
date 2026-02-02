import { betterAuth } from "better-auth";
import type { User as AuthUser } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import type { GenericEndpointContext } from "@better-auth/core";
import { APIError } from "better-call";
import { InvitationType, Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { randomUUID } from "crypto";

export const authConfig = {
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (
					user: AuthUser,
					context: GenericEndpointContext | null,
				) => {
					if (!context?.path?.endsWith("/sign-up/email")) return;

					const normalizeEmail = (value: unknown) => {
						if (typeof value !== "string") return "";
						return value.trim().toLowerCase();
					};

					const inviteToken =
						typeof context?.body?.inviteToken === "string"
							? context.body.inviteToken.trim()
							: "";

					if (inviteToken) {
						const inviteResult = await getValidInvitation(inviteToken);
						if (
							inviteResult.ok &&
							inviteResult.invitation.type === InvitationType.MEMBER &&
							inviteResult.invitation.agencyId
						) {
							const inviteEmail = normalizeEmail(inviteResult.invitation.email);
							const signupEmail = normalizeEmail(context?.body?.email);
							if (inviteEmail && inviteEmail === signupEmail) {
								return;
							}
						}
					}

					const agencyName =
						typeof context?.body?.agencyName === "string"
							? context.body.agencyName.trim()
							: "";

					const cleanupUser = async (userId: string) => {
						try {
							await prisma.user.delete({ where: { id: userId } });
						} catch (cleanupError) {
							console.error(
								`Failed to cleanup user ${userId}:`,
								cleanupError,
							);
						}
					};

					if (!agencyName) {
						cleanupUser(user.id);
						throw new APIError("BAD_REQUEST", {
							message: "Agency name is required",
						});
					}

					try {
						await prisma.$transaction(async (tx) => {
							const agency = await tx.agency.create({
								data: { name: agencyName },
							});

							await tx.membership.create({
								data: {
									userId: user.id,
									agencyId: agency.id,
									role: Role.OWNER,
								},
							});
						});
					} catch {
						await cleanupUser(user.id);
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message: "Unable to create agency",
						});
					}
				},
			},
		},
	},
	plugins: [nextCookies()],
	generateId: () => randomUUID(),
};

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	...authConfig,
});
