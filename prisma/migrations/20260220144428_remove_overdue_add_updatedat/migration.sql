/*
  Warnings:

  - The values [OVERDUE] on the enum `ApprovalStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `approval_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ApprovalStatus_new" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "public"."approval_item" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "approval_item" ALTER COLUMN "status" TYPE "ApprovalStatus_new" USING ("status"::text::"ApprovalStatus_new");
ALTER TYPE "ApprovalStatus" RENAME TO "ApprovalStatus_old";
ALTER TYPE "ApprovalStatus_new" RENAME TO "ApprovalStatus";
DROP TYPE "public"."ApprovalStatus_old";
ALTER TABLE "approval_item" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "approval_item" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
