import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/src/lib/prisma";
import { signupOwnerAction } from "@/src/app/(auth)/sign-up/actions";

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
  form.set("name", overrides?.name ?? "Alicia Keys");
  form.set("email", overrides?.email ?? "alicia@example.com");
  form.set("password", overrides?.password ?? "longpassword");
  form.set("agencyName", overrides?.agencyName ?? "Keys Agency");
  return form;
}

describe("signupOwnerAction", () => {
  beforeEach(async (t) => {
    if (!(await ensureDbAvailable())) {
      t.skip("Database not available");
      return;
    }
    await resetDb();
  });

  it("returns ok:true for new signup", async () => {
    const result = await signupOwnerAction(buildForm());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.redirectTo, "/");
    }
  });

  it("creates agency and membership via database hooks", async () => {
    const result = await signupOwnerAction(buildForm());
    assert.equal(result.ok, true);

    const user = await prisma.user.findUnique({
      where: { email: "alicia@example.com" },
    });
    assert.ok(user);

    const agency = await prisma.agency.findFirst({
      where: { name: "Keys Agency" },
    });
    assert.ok(agency);

    const membership = await prisma.membership.findFirst({
      where: { userId: user?.id, agencyId: agency?.id },
    });
    assert.ok(membership);
    assert.equal(membership?.role, "OWNER");
  });

  it("returns ok:false with a generic message for existing signup", async () => {
    await prisma.user.create({
      data: {
        name: "Existing",
        email: "alicia@example.com",
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const beforeUsers = await prisma.user.count();
    const result = await signupOwnerAction(buildForm());
    const afterUsers = await prisma.user.count();

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.formError, "User already exists. Use another email.");
    }
    assert.equal(afterUsers, beforeUsers);
  });
});
