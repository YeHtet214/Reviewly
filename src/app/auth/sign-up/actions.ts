"use server";

import { APIError } from "better-call";
import { z } from "zod";
import { InvitationType, Role } from "@/prisma/generated/client";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { signupOwnerSchema } from "@/src/server/validation/auth";
import { type SignupActionResult } from "@/src/types/auth";

const DEFAULT_REDIRECT = "/";
const DEFAULT_SIGNUP_ERROR_MESSAGE = "Unable to create account.";
const DEFAULT_INVITE_ERROR_MESSAGE = "Invite link is invalid or expired.";

const normalizedEmailSchema = z.preprocess(
	(value) => {
		if (typeof value !== "string") return value;
		return value.trim().toLowerCase();
	},
	z.string().email("Email is invalid"),
);

const inviteSignupSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: normalizedEmailSchema,
	password: z.string().min(8, "Password must be at least 8 characters"),
});

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const EMAIL_ALREADY_EXISTS_CODES = new Set([
	"ACCOUNT_EXISTS",
	"USER_ALREADY_EXISTS",
	"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

function mapSignupError(error: unknown): SignupActionResult {
	if (error instanceof APIError) {
		const errorBody = error.body;
		const errorCode =
			typeof errorBody?.code === "string" ? errorBody.code : undefined;
		const errorMessage = String(error.message || "");
		if (
			(errorCode && EMAIL_ALREADY_EXISTS_CODES.has(errorCode)) ||
			errorMessage.toLowerCase().includes("already exists") ||
			errorMessage.toLowerCase().includes("already in use")
		) {
			return {
				ok: false,
				fieldErrors: { email: ["Email already in use."] },
			};
		}
		return {
			ok: false,
			formError:
				error.body?.message || error.message || DEFAULT_SIGNUP_ERROR_MESSAGE,
		};
	}

	return { ok: false, formError: DEFAULT_SIGNUP_ERROR_MESSAGE };
}

export async function signupAction(
	formData: FormData,
): Promise<SignupActionResult> {
	const raw = {
		name: String(formData.get("name") || ""),
		email: String(formData.get("email") || ""),
		password: String(formData.get("password") || ""),
		agencyName: String(formData.get("agencyName") || ""),
	};
	const inviteToken = String(formData.get("inviteToken") || "").trim();
	console.log("INVITE TOKEN: ", inviteToken);
	if (inviteToken) {
		return signupInvite(raw.name, raw.email, raw.password, inviteToken);
	}

	console.log("NO token considered");


	return signupOwner(raw.name, raw.email, raw.password, raw.agencyName);
}

async function signupInvite(
	name: string,
	email: string,
	password: string,
	inviteToken: string,
): Promise<SignupActionResult> {
	const inviteParsed = inviteSignupSchema.safeParse({
		name,
		email,
		password,
	});
	if (!inviteParsed.success) {
		return {
			ok: false,
			fieldErrors: inviteParsed.error.flatten().fieldErrors,
		};
	}

	const inviteResult = await getValidInvitation(inviteToken);
	if (!inviteResult.ok) {
		return { ok: false, formError: DEFAULT_INVITE_ERROR_MESSAGE };
	}

	const invitation = inviteResult.invitation;
	if (
		invitation.type !== InvitationType.MEMBER &&
		invitation.type !== InvitationType.CLIENT
	) {
		return { ok: false, formError: DEFAULT_INVITE_ERROR_MESSAGE };
	}

	const agencyId = invitation.agencyId;
	if (!agencyId) {
		return { ok: false, formError: DEFAULT_INVITE_ERROR_MESSAGE };
	}

	const normalizedSignupEmail = normalizeEmail(inviteParsed.data.email);
	const normalizedInviteEmail = normalizeEmail(invitation.email);
	if (normalizedSignupEmail !== normalizedInviteEmail) {
		return {
			ok: false,
			fieldErrors: { email: ["Email does not match invitation."] },
		};
	}

	let userId: string | null = null;

	try {
		type SignUpEmailBody =
			NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"] & {
				inviteToken: string;
			};

		const body: SignUpEmailBody = {
			name: inviteParsed.data.name,
			email: inviteParsed.data.email,
			password: inviteParsed.data.password,
			inviteToken,
		};

		const response = await auth.api.signUpEmail({
			body,
		});
		userId = response?.user?.id ?? null;
	} catch (error: unknown) {
		return mapSignupError(error);
	}

	if (!userId) {
		return { ok: false, formError: DEFAULT_SIGNUP_ERROR_MESSAGE };
	}

	const consumedAt = new Date();
	const role = invitation.role ?? Role.MEMBER;

	try {
		await prisma.$transaction(async (tx) => {
			const updated = await tx.invitation.updateMany({
				where: {
					id: invitation.id,
					consumedAt: null,
					expiresAt: { gte: consumedAt },
					type: invitation.type,
					agencyId: { not: null },
				},
				data: { consumedAt },
			});

			console.log("Invite token is ok:", inviteToken);
			console.log("Updated count:", updated);

			if (updated.count === 0) {
				throw new Error("Invite already consumed.");
			}

			if (invitation.type === InvitationType.MEMBER) {
				const existingMembership = await tx.membership.findFirst({
					where: {
						userId,
						agencyId,
					},
					select: { id: true },
				});

				if (!existingMembership) {
					await tx.membership.create({
						data: {
							userId,
							agencyId,
							role,
						},
					});
				}
			} else if (invitation.type === InvitationType.CLIENT) {
				if (!invitation.projectId) {
					throw new Error("Client invitation missing project ID");
				}

				// Find or create the Client record
				let client = await tx.client.findUnique({
					where: { email: normalizedSignupEmail },
				});

				if (!client) {
					client = await tx.client.create({
						data: {
							email: normalizedSignupEmail,
							name: inviteParsed.data.name,
							createdAt: new Date(),
						},
					});
				}

				// Create ClientProjectAccess if it doesn't exist
				// We use upsert or just create with ignore if possible, but prisma create throws on unique constraint
				// So we check first or just use upsert
				await tx.clientProjectAccess.upsert({
					where: {
						clientId_projectId: {
							clientId: client.id,
							projectId: invitation.projectId,
						},
					},
					create: {
						clientId: client.id,
						projectId: invitation.projectId,
						invitedByUserId: invitation.invitedByUserId,
						invitedAt: invitation.createdAt,
					},
					update: {}, // No update needed if exists
				});
			}
		});
	} catch (err) {
		console.error("signupInvite error:", err);
		try {
			await prisma.user.delete({ where: { id: userId } });
		} catch (cleanupError) {
			console.error("signupOwnerAction: invite cleanup failed", cleanupError);
		}
		return { ok: false, formError: DEFAULT_INVITE_ERROR_MESSAGE };
	}

	return { ok: true, redirectTo: DEFAULT_REDIRECT };
}

async function signupOwner(
	name: string,
	email: string,
	password: string,
	agencyName: string,
): Promise<SignupActionResult> {
	const parsed = signupOwnerSchema.safeParse({
		name,
		email,
		password,
		agencyName,
	});
	if (!parsed.success) {
		return {
			ok: false,
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		type SignUpEmailBody =
			NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"] & {
				agencyName: string;
			};
		const body: SignUpEmailBody = {
			name: parsed.data.name,
			email: parsed.data.email,
			password: parsed.data.password,
			agencyName: parsed.data.agencyName,
		};

		console.log("Sign up body: ", body);

		await auth.api.signUpEmail({ body });

		return { ok: true, redirectTo: DEFAULT_REDIRECT };
	} catch (error: unknown) {
		console.log("error", error);
		return mapSignupError(error);
	}
}
