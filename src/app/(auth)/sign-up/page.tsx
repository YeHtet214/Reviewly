"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signupOwnerAction } from "./actions";

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "agencyName", string[]>
>;

export default function SignupPage() {
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

      const result = await signupOwnerAction(formData);

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
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-subtitle">
                Start managing your agencies today
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="stack-4">
            {formError ? <p className="error-text">{formError}</p> : null}

            <div className="stack-4">
              <div className="stack-2">
                <label htmlFor="name" className="label">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  className={`input${fieldErrors.name?.[0] ? " input-invalid" : ""}`}
                />
                {fieldErrors.name?.[0] ? (
                  <p className="error-text">{fieldErrors.name[0]}</p>
                ) : null}
              </div>

              <div className="stack-2">
                <label htmlFor="email" className="label">
                  Work email
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
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`input${
                    fieldErrors.password?.[0] ? " input-invalid" : ""
                  }`}
                />
                {fieldErrors.password?.[0] ? (
                  <p className="error-text">{fieldErrors.password[0]}</p>
                ) : null}
              </div>

              <div className="stack-2">
                <label htmlFor="agencyName" className="label">
                  Agency name
                </label>
                <input
                  id="agencyName"
                  name="agencyName"
                  type="text"
                  placeholder="Your agency"
                  autoComplete="organization"
                  className={`input${
                    fieldErrors.agencyName?.[0] ? " input-invalid" : ""
                  }`}
                />
                {fieldErrors.agencyName?.[0] ? (
                  <p className="error-text">{fieldErrors.agencyName[0]}</p>
                ) : null}
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? "Creating account..." : "Create account"}
            </button>

            <p className="muted">This will create a new agency for you</p>

            <div className="row-start">
              <span className="muted">Already have an account?</span>
              <Link className="btn-ghost" href="/sign-in">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
