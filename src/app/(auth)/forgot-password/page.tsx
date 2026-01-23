"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") || "").trim();

    if (!nextEmail) {
      setSubmittedEmail(null);
      return;
    }

    setIsLoading(true);
    setSubmittedEmail(null);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to request reset link.");
      }

      setSubmittedEmail(nextEmail);
    } catch {
      setSubmittedEmail(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-7">
      <div className="w-full max-w-[520px] rounded-xl border border-border bg-surface p-7 shadow-md">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-semibold text-text">Reviewly</span>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold leading-tight tracking-[-0.015em] text-text">
                Reset your password
              </h1>
              <p className="text-sm leading-normal text-text-3">
                We&apos;ll email you a link to choose a new password.
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {submittedEmail ? (
              <p className="text-sm leading-normal text-text-2">
                If an account exists for{" "}
                <span className="font-semibold text-text">{submittedEmail}</span>,
                you&apos;ll receive a reset link shortly.
              </p>
            ) : (
              <p className="text-sm leading-normal text-text-2">
                Enter the email address associated with your account.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-pill border border-border bg-muted px-3.5 text-sm leading-normal text-text transition placeholder:text-text-3 focus-visible:border-brand-500 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/35 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || email.trim().length === 0}
              className="h-11 w-full rounded-pill bg-brand-500 text-sm font-semibold text-white shadow-md transition hover:bg-brand-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isLoading ? "Sending link..." : "Send reset link"}
            </button>

            <div className="flex items-center justify-center gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-pill border border-transparent px-4 text-sm font-semibold text-text transition hover:border-border hover:bg-muted"
                href="/sign-in"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
