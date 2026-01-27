import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { acceptInvite } from "@/src/server/invitations/accept-invite";
import { InviteErrorCode } from "@/src/server/invitations/errors";
import { getValidInvitation } from "@/src/server/invitations/get-invite";

const SIGN_IN_PATH = "/sign-in";
const SET_PASSWORD_PATH = "/set-password";
const DASHBOARD_PATH = "/";
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

export default async function InviteCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <InviteError
        title="Invite link is invalid"
        message={DEFAULT_INVITE_ERROR_MESSAGE}
      />
    );
  }

  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user?.id) {
    const params = new URLSearchParams({ inviteToken: token });
    redirect(`${SIGN_IN_PATH}?${params.toString()}`);
  }

  const inviteResult = await getValidInvitation(token);
  if (!inviteResult.ok) {
    return (
      <InviteError
        title="Invite link is invalid"
        message={MESSAGE_BY_CODE[inviteResult.code] ?? DEFAULT_INVITE_ERROR_MESSAGE}
      />
    );
  }

  if (inviteResult.invitation.type === "CLIENT") {
    return (
      <InviteError
        title="Invite not supported"
        message="Client invitations are not supported yet."
      />
    );
  }

  const acceptResult = await acceptInvite({
    token,
    userId: session.user.id,
  });

  if (!acceptResult.ok) {
    return (
      <InviteError
        title="Unable to accept invite"
        message={acceptResult.message}
      />
    );
  }

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: { not: null },
    },
    select: { id: true },
  });

  redirect(credentialAccount ? DASHBOARD_PATH : SET_PASSWORD_PATH);
}
