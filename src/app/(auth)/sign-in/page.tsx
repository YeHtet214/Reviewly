"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <Card className="w-full max-w-[440px] rounded-xl border-transparent p-8 shadow-sm">
        <CardHeader className="p-0">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="inline-flex h-6 w-6 rounded-full bg-pink-500" />
            <span className="text-lg font-semibold text-neutral-900">
              AgencyHub
            </span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-neutral-900">Sign in</h1>
            <p className="mb-6 mt-2 text-base text-neutral-500">
              Welcome back to AgencyHub
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            {formError ? (
              <p className="mb-4 text-sm text-red-600">{formError}</p>
            ) : null}

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="email"
                  className="mb-1 block text-left text-sm font-medium text-neutral-900"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-11 rounded-full border-transparent bg-neutral-100 px-4"
                />
                {fieldErrors.email?.[0] ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.email[0]}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-left text-sm font-medium text-neutral-900"
                  >
                    Password
                  </Label>
                  <a className="text-sm font-medium text-pink-500" href="#">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 rounded-full border-transparent bg-neutral-100 px-4"
                />
                {fieldErrors.password?.[0] ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.password[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="mt-6 h-11 w-full rounded-full bg-pink-500 text-sm font-semibold text-white"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>

            <p className="mt-6 text-center text-sm text-neutral-600">
              Don&apos;t have an account?{" "}
              <a className="font-medium text-pink-500" href="/sign-up">
                Sign up
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
