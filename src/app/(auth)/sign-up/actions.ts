"use server";

import { APIError } from "better-call";
import { auth } from "@/src/lib/auth";
import { signupOwnerSchema } from "@/src/server/validation/auth";
import { type SignupActionResult } from "@/src/types/auth";

const DEFAULT_REDIRECT = "/";
const INVITE_REDIRECT = "/invite/complete";

export async function signupOwnerAction(
	formData: FormData,
): Promise<SignupActionResult> {
	const raw = {
		name: String(formData.get("name") || ""),
		email: String(formData.get("email") || ""),
		password: String(formData.get("password") || ""),
		agencyName: String(formData.get("agencyName") || ""),
	};
	const inviteToken = String(formData.get("inviteToken") || "").trim();	

	const parsed = signupOwnerSchema.safeParse(raw);
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

		await auth.api.signUpEmail({ body });

		const redirectTo = inviteToken
			? `${INVITE_REDIRECT}?token=${encodeURIComponent(inviteToken)}`
			: DEFAULT_REDIRECT;
		return { ok: true, redirectTo };
	} catch (error) {
		if (error instanceof APIError) {
			const errorBody = (error as any).body as { code?: string } | undefined;
			const errorCode = errorBody?.code ?? (error as any).code;
			const errorMessage = String(error.message || "");
			if (
				errorCode === "ACCOUNT_EXISTS" ||
				errorCode === "USER_ALREADY_EXISTS" ||
				errorCode === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
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
					error.body?.message || error.message || "Unable to create account.",
			};
		}

		return { ok: false, formError: "Unable to create account." };
	}
}
