import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { InviteErrorCode } from "@/src/server/invitations/errors";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { acceptInviteAction } from "./actions";

const SIGN_IN_PATH = "/sign-in";
const DEFAULT_INVITE_ERROR_MESSAGE = "Invite link is invalid or expired.";

const MESSAGE_BY_CODE: Record<InviteErrorCode, string> = {
  [InviteErrorCode.NOT_FOUND]: "Invite link was not found.",
  [InviteErrorCode.EXPIRED]: "Invite link has expired.",
  [InviteErrorCode.CONSUMED]: "Invite link has already been used.",
  [InviteErrorCode.INVALID]: "Invite link is invalid.",
};

function InviteError({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="stack-6">
          <header className="stack-3">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle">{message}</p>
            </div>
          </header>

          <Link className="btn-secondary w-full" href={SIGN_IN_PATH}>
            Go to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

function resolveErrorMessage(code?: string) {
  if (!code) return null;
  if (code in MESSAGE_BY_CODE) {
    return MESSAGE_BY_CODE[code as keyof typeof MESSAGE_BY_CODE];
  }
  return DEFAULT_INVITE_ERROR_MESSAGE;
}

export default async function InviteCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const errorCode = typeof params.error === "string" ? params.error : "";

  if (!token) {
    return (
      <InviteError
        title="Invite link is invalid"
        message={DEFAULT_INVITE_ERROR_MESSAGE}
      />
    );
  }

  const errorMessage = resolveErrorMessage(errorCode);
  if (errorMessage) {
    return (
      <InviteError
        title={
          errorCode === "NOT_IMPLEMENTED"
            ? "Invite not supported"
            : "Invite link is invalid"
        }
        message={errorMessage}
      />
    );
  }

  const inviteResult = await getValidInvitation(token);
  if (!inviteResult.ok) {
    return (
      <InviteError
        title="Invite link is invalid"
        message={
          MESSAGE_BY_CODE[inviteResult.code] ?? DEFAULT_INVITE_ERROR_MESSAGE
        }
      />
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const params = new URLSearchParams({
      inviteToken: token,
      email: inviteResult.invitation.email,
    });
    redirect(`${SIGN_IN_PATH}?${params.toString()}`);
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="stack-6">
          <header className="stack-3">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">Accept your invite</h1>
              <p className="auth-subtitle">
                You&apos;re invited as {inviteResult.invitation.email}.
              </p>
            </div>
          </header>

          <div className="stack-4">
            <form action={acceptInviteAction.bind(null, token)}>
              <button type="submit" className="btn-primary w-full">
                Accept invite
              </button>
            </form>

            <p className="muted">
              You will be redirected after accepting the invitation.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
