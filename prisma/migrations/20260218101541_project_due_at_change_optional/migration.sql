/*
  Warnings:

  - Made the column `createdByUserId` on table `project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "client" ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project" ALTER COLUMN "dueAt" DROP NOT NULL,
ALTER COLUMN "createdByUserId" SET NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "client_email_idx" ON "client"("email");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
