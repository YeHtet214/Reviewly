"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSetPasswordStatusAction, setPasswordAction } from "./actions";

type FieldErrors = Partial<Record<"password" | "confirmPassword", string[]>>;

export default function SetPasswordPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isActive = true;

    const checkStatus = async () => {
      try {
        const status = await getSetPasswordStatusAction();
        if (!isActive) return;
        if (!status.ok) {
          router.replace(status.redirectTo);
        }
      } catch {
        if (!isActive) return;
        setFormError("Unable to verify access. Please refresh and try again.");
      }
    };

    checkStatus();

    return () => {
      isActive = false;
    };
  }, [router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setFormError(null);
      setFieldErrors({});

      let result;
      try {
        result = await setPasswordAction(formData);
      } catch {
        setFormError("Something went wrong. Please try again.");
        return;
      }

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
        <div className="stack-5">
          <header className="stack-2">
            <div className="auth-brand">
              <span className="section-title">Reviewly</span>
            </div>
            <div>
              <h1 className="auth-title">Set your password</h1>
              <p className="auth-subtitle">
                Create a password to sign in next time
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="stack-4">
            {formError ? <p className="error-text">{formError}</p> : null}

            <div className="stack-4">
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
                  className={`input${fieldErrors.password?.[0] ? " input-invalid" : ""}`}
                />
                {fieldErrors.password?.[0] ? (
                  <p className="error-text">{fieldErrors.password[0]}</p>
                ) : null}
              </div>

              <div className="stack-2">
                <label htmlFor="confirmPassword" className="label">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`input${fieldErrors.confirmPassword?.[0] ? " input-invalid" : ""
                    }`}
                />
                {fieldErrors.confirmPassword?.[0] ? (
                  <p className="error-text">{fieldErrors.confirmPassword[0]}</p>
                ) : null}
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? "Setting password..." : "Set password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
