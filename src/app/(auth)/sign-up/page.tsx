"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <Card className="w-full max-w-[440px] rounded-xl border-transparent p-8 shadow-sm">
        <CardHeader className="p-0">
          <div className="mb-6 text-center text-lg font-semibold text-neutral-900">
            AgencyHub
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Create your account
            </h1>
            <p className="mb-6 mt-2 text-base text-neutral-500">
              Start managing your agencies today
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
                  htmlFor="name"
                  className="mb-1 block text-left text-sm font-medium text-neutral-900"
                >
                  Full name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  className="h-11 rounded-full border-transparent bg-neutral-100 px-4"
                />
                {fieldErrors.name?.[0] ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.name[0]}
                  </p>
                ) : null}
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="mb-1 block text-left text-sm font-medium text-neutral-900"
                >
                  Work email
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
                <Label
                  htmlFor="password"
                  className="mb-1 block text-left text-sm font-medium text-neutral-900"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-11 rounded-full border-transparent bg-neutral-100 px-4"
                />
                {fieldErrors.password?.[0] ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.password[0]}
                  </p>
                ) : null}
              </div>

              <div>
                <Label
                  htmlFor="agencyName"
                  className="mb-1 block text-left text-sm font-medium text-neutral-900"
                >
                  Agency name
                </Label>
                <Input
                  id="agencyName"
                  name="agencyName"
                  type="text"
                  placeholder="Your agency"
                  autoComplete="organization"
                  className="h-11 rounded-full border-transparent bg-neutral-100 px-4"
                />
                {fieldErrors.agencyName?.[0] ? (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.agencyName[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="mt-6 h-11 w-full rounded-full bg-pink-500 text-sm font-semibold text-white"
            >
              {isPending ? "Creating account..." : "Create account"}
            </Button>

            <p className="mt-3 text-center text-sm text-neutral-500">
              This will create a new agency for you
            </p>

            <p className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <a className="font-medium text-pink-500" href="/signin">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
