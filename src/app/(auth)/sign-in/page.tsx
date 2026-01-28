import { Suspense } from "react";
import SignInForm from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="stack-6">
          <header className="stack-3">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">Sign in</h1>
              <p className="auth-subtitle">Welcome back to Reviewly</p>
            </div>
          </header>

          <Suspense fallback={<SignInFormFallback />}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function SignInFormFallback() {
  return (
    <div className="stack-4">
      <div className="stack-4">
        <div className="stack-2">
          <div className="label">Email</div>
          <div className="input bg-transparent" aria-hidden="true" />
        </div>
        <div className="stack-2">
          <div className="label">Password</div>
          <div className="input bg-transparent" aria-hidden="true" />
        </div>
      </div>
      <div className="btn-primary w-full" aria-hidden="true" />
    </div>
  );
}
