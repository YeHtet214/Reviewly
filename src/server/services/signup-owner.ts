import prisma from "@/src/lib/prisma";
import { Role } from "@/prisma/generated/client";
import { signupOwnerSchema, type SignUpInput } from "@/src/server/validation/auth";

export type SignupOwnerErrorCode = "ACCOUNT_EXISTS" | "VALIDATION_ERROR";

export type SignupOwnerFieldErrors = Partial<
  Record<keyof SignUpInput, string[]>
>;

export class SignupOwnerError extends Error {
  code: SignupOwnerErrorCode;
  fieldErrors?: SignupOwnerFieldErrors;

  constructor(
    code: SignupOwnerErrorCode,
    message: string,
    fieldErrors?: SignupOwnerFieldErrors,
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function signupOwner(
  input: SignUpInput,
): Promise<{ userId: string; agencyId: string }> {
  const parsed = signupOwnerSchema.safeParse(input);
  if (!parsed.success) {
    throw new SignupOwnerError(
      "VALIDATION_ERROR",
      "Invalid signup input",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data = parsed.data;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existing) {
      throw new SignupOwnerError("ACCOUNT_EXISTS", "Account already exists");
    }

    const now = new Date();
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true },
    });

    const agency = await tx.agency.create({
      data: { name: data.agencyName },
      select: { id: true },
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        agencyId: agency.id,
        role: Role.OWNER,
      },
      select: { id: true },
    });

    return { userId: user.id, agencyId: agency.id };
  });
}
