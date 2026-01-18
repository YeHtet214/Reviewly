export type SignupActionFieldErrors = Partial<
  Record<"name" | "email" | "password" | "agencyName", string[]>
>;

export type SignupActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; fieldErrors?: SignupActionFieldErrors; formError?: string };
