import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { auth } from "@/src/lib/auth";
import { signInAction } from "@/src/app/(auth)/sign-in/actions";

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
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
}

function buildForm(overrides?: Partial<Record<string, string>>) {
  const form = new FormData();
  form.set("email", overrides?.email ?? "casey@example.com");
  form.set("password", overrides?.password ?? "longpassword");
  return form;
}

async function seedUser() {
  await auth.api.signUpEmail({
    body: {
      name: "Casey",
      email: "casey@example.com",
      password: "longpassword",
      agencyName: "Casey Agency",
    },
  });
}

describe("signInAction", () => {
  beforeEach(async (t) => {
    if (!(await ensureDbAvailable())) {
      t.skip("Database not available");
      return;
    }
    await resetDb();
  });

  it("returns fieldErrors for invalid input", async () => {
    const result = await signInAction(
      buildForm({ email: "not-an-email", password: "" }),
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.fieldErrors?.email?.length);
      assert.ok(result.fieldErrors?.password?.length);
    }
  });

  it("returns ok:false with a generic message for invalid credentials", async () => {
    await seedUser();

    const result = await signInAction(
      buildForm({ password: "wrongpassword" }),
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.formError, "Invalid email or password.");
    }
  });

  it("returns ok:true and redirectTo for valid credentials", async () => {
    await seedUser();

    const result = await signInAction(buildForm());

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.redirectTo, "/");
    }
  });
});
