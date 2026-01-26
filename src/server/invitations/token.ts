import crypto from "node:crypto";

const TOKEN_BYTES = 32;

export function generateInviteToken(): string {
	return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

const inviteTokenSecret = process.env.INVITE_TOKEN_SECRET;

export function hashInviteToken(token: string): string {
	if (!inviteTokenSecret) {
		throw new Error("INVITE_TOKEN_SECRET environment variable is not set.");
	}
  
	return crypto
		.createHmac("sha256", inviteTokenSecret)
		.update(token)
		.digest("hex");
}
