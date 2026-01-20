import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { signupOwner, SignupOwnerError } from "@/src/server/services/signup-owner";

let dbAvailable: boolean | null = null;

async function ensureDbAvailable() {
  if (dbAvailable !== null) return dbAvailable;
  try {
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

async function resetDb() {
  await prisma.membership.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
}

describe("signupOwner (db)", { concurrency: 1 }, () => {
  beforeEach(async (t) => {
    if (!(await ensureDbAvailable())) {
      t.skip("Database not available");
      return;
    }
    await resetDb();
  });

  it("creates user, agency, and membership for a new signup", async () => {
    const result = await signupOwner({
      name: "Ada Lovelace",
      email: "  Ada@Example.COM ",
      password: "longpassword",
      agencyName: "Analytical Engines",
    });

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    const agency = await prisma.agency.findUnique({
      where: { id: result.agencyId },
    });
    const membership = await prisma.membership.findFirst({
      where: { userId: result.userId, agencyId: result.agencyId },
    });

    assert.ok(user);
    assert.ok(agency);
    assert.ok(membership);
    assert.equal(user.email, "ada@example.com");
    assert.equal(membership.role, "OWNER");
  });

  it("returns ACCOUNT_EXISTS and creates nothing for an existing email", async () => {
    await prisma.user.create({
      data: {
        name: "Existing",
        email: "existing@example.com",
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const beforeUsers = await prisma.user.count();
    const beforeAgencies = await prisma.agency.count();
    const beforeMemberships = await prisma.membership.count();

    let caught: SignupOwnerError | null = null;
    try {
      await signupOwner({
        name: "New User",
        email: "existing@example.com",
        password: "longpassword",
        agencyName: "Should Not Exist",
      });
    } catch (error) {
      caught = error as SignupOwnerError;
    }

    assert.ok(caught);
    assert.equal(caught?.code, "ACCOUNT_EXISTS");
    assert.equal(await prisma.user.count(), beforeUsers);
    assert.equal(await prisma.agency.count(), beforeAgencies);
    assert.equal(await prisma.membership.count(), beforeMemberships);
  });
});

describe("signupOwner (validation)", () => {
  it("returns validation errors for invalid input", async () => {
    let caught: SignupOwnerError | null = null;
    try {
      await signupOwner({
        name: "",
        email: "not-an-email",
        password: "short",
        agencyName: "",
      });
    } catch (error) {
      caught = error as SignupOwnerError;
    }

    assert.ok(caught);
    assert.equal(caught?.code, "VALIDATION_ERROR");
    assert.ok(caught?.fieldErrors?.email?.length);
    assert.ok(caught?.fieldErrors?.password?.length);
    assert.ok(caught?.fieldErrors?.name?.length);
    assert.ok(caught?.fieldErrors?.agencyName?.length);
  });
});
