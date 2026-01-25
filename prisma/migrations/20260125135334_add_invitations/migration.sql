-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('MEMBER', 'CLIENT');

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "agencyId" TEXT,
    "projectId" TEXT,
    "role" "Role",
    "invitedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokenHash_key" ON "invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_agencyId_idx" ON "invitation"("agencyId");

-- CreateIndex
CREATE INDEX "invitation_projectId_idx" ON "invitation"("projectId");

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
