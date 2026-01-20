export type SignupActionFieldErrors = Partial<
  Record<"name" | "email" | "password" | "agencyName", string[]>
>;

export type SignupActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; fieldErrors?: SignupActionFieldErrors; formError?: string };

export type SignInActionFieldErrors = Partial<
  Record<"email" | "password", string[]>
>;

export type SignInActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; fieldErrors?: SignInActionFieldErrors; formError?: string };
