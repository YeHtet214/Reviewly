import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import LoginForm from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Invite link was not found.",
  EXPIRED: "Invite link has expired.",
  CONSUMED: "Invite link has already been used.",
  INVALID: "Link is invalid or expired.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
};

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const errorCode = typeof params.error === "string" ? params.error : null;
  const initialError = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong.")
    : null;

  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <div className="stack-6">
          <CardHeader className="stack-3">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">Client portal</h1>
              <p className="auth-subtitle">
                {sent
                  ? "Check your email for a login link."
                  : "Enter your email to receive a login link."}
              </p>
            </div>
          </CardHeader>

          <CardContent className="stack-4">
            {sent ? (
              <p className="muted">
                If your email is registered, you will receive a login link
                shortly. The link expires in 1 hour.
              </p>
            ) : (
                <LoginForm initialError={initialError} />
            )}
          </CardContent>
        </div>
      </Card>
    </main>
  );
}
