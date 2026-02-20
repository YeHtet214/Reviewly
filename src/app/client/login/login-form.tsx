"use client";

import { useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { requestLoginLinkAction } from "./actions";

type LoginFormProps = {
  initialError?: string | null;
};

export default function LoginForm({ initialError = null }: LoginFormProps) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return; // prevent double-submit

    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      try {
        const result = await requestLoginLinkAction(formData);
        // If the action redirects (success), this line is never reached.
        // If it returns an error, show it.
        if (!result.ok) {
          setError(result.error);
        }
      } catch {
        // Catch unexpected thrown errors (e.g. network failure)
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="stack-4">
      {error && <p className="error-text">{error}</p>}

      <div className="stack-2">
        <label htmlFor="email" className="muted">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        className="btn-primary w-full"
        disabled={isPending}
      >
        {isPending ? "Sending..." : "Send login link"}
      </Button>
    </form>
  );
}
