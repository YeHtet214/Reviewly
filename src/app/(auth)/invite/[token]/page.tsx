import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { getValidInvitation } from "@/src/server/invitations/get-invite";
import { continueInviteAction, goToSignInAction } from "./actions";

function formatInviteType(type: "MEMBER" | "CLIENT") {
  return type === "MEMBER" ? "Member" : "Client";
}

function inviteHelperText(type: "MEMBER" | "CLIENT") {
  return type === "MEMBER"
    ? "You will set a password after accepting the invitation."
    : "You will sign in to view the shared project.";
}

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const result = await getValidInvitation(token);
  const title = result.ok
    ? "You're invited"
    : "Invite link is invalid or expired";

  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <div className="stack-6">
          <CardHeader className="stack-3">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">{title}</h1>
              {!result.ok ? (
                <p className="auth-subtitle">
                  Request a new invite link from the sender.
                </p>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="stack-4">
            {result.ok ? (
              <>
                <div className="stack-2">
                  <p className="muted">Invited email</p>
                  <p className="section-title">{result.invitation.email}</p>
                  <div className="row-start">
                    <span className="badge badge-role">
                      {formatInviteType(result.invitation.type)}
                    </span>
                  </div>
                </div>

                <form action={continueInviteAction.bind(null, token)}>
                  <Button type="submit" className="btn-primary w-full">
                    Continue
                  </Button>
                </form>

                <p className="muted">
                  {inviteHelperText(result.invitation.type)}
                </p>
              </>
            ) : (
              <form action={goToSignInAction}>
                <Button type="submit" className="btn-secondary w-full">
                  Go to sign in
                </Button>
              </form>
            )}
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
