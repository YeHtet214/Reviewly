import { z } from "zod";

const normalizedEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.trim().toLowerCase();
  },
  z.string().email("Email is invalid"),
);

export const signupOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: normalizedEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  agencyName: z.string().min(1, "Agency name is required"),
});

export type SignUpInput = z.infer<typeof signupOwnerSchema>;

export const signInSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
