import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-call";
import { Role } from "@/prisma/generated/client";
import prisma from "@/src/lib/prisma";
import { randomUUID } from "crypto";

export const authConfig = {
	emailAndPassword: {
		enabled: true,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user, context) => {
					if (!context?.path?.endsWith("/sign-up/email")) return;

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
					} catch (error) {
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
	// @ts-ignore - generateId is valid but not in types
	generateId: () => randomUUID(),
};

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	...authConfig,
});
