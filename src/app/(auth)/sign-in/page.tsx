"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signInAction } from "./actions";

type FieldErrors = Partial<Record<"email" | "password", string[]>>;

export default function SignInPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setFormError(null);
      setFieldErrors({});

      const result = await signInAction(formData);

      if (result.ok) {
        router.push(result.redirectTo);
        return;
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      if (result.formError) {
        setFormError(result.formError);
      }
    });
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
              <h1 className="auth-title">Sign in</h1>
              <p className="auth-subtitle">Welcome back to Reviewly</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="stack-4">
            {formError ? <p className="error-text">{formError}</p> : null}

            <div className="stack-4">
              <div className="stack-2">
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={`input${fieldErrors.email?.[0] ? " input-invalid" : ""}`}
                />
                {fieldErrors.email?.[0] ? (
                  <p className="error-text">{fieldErrors.email[0]}</p>
                ) : null}
              </div>

              <div className="stack-2">
                <div className="row">
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <a className="btn-ghost" href="#">
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`input${
                    fieldErrors.password?.[0] ? " input-invalid" : ""
                  }`}
                />
                {fieldErrors.password?.[0] ? (
                  <p className="error-text">{fieldErrors.password[0]}</p>
                ) : null}
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? "Signing in..." : "Sign in"}
            </button>

            <div className="row-start">
              <span className="muted">Don&apos;t have an account?</span>
              <Link className="btn-ghost" href="/sign-up">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
