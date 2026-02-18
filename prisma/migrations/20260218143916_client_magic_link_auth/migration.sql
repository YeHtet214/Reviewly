-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'OVERDUE');

-- AlterTable
ALTER TABLE "client" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "approval_item" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_session" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "client_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_login_link" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_login_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_item_projectId_idx" ON "approval_item"("projectId");

-- CreateIndex
CREATE INDEX "approval_item_status_idx" ON "approval_item"("status");

-- CreateIndex
CREATE INDEX "approval_item_dueAt_idx" ON "approval_item"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_session_tokenHash_key" ON "client_session"("tokenHash");

-- CreateIndex
CREATE INDEX "client_session_clientId_idx" ON "client_session"("clientId");

-- CreateIndex
CREATE INDEX "client_session_expiresAt_idx" ON "client_session"("expiresAt");

-- CreateIndex
CREATE INDEX "client_session_revokedAt_idx" ON "client_session"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_login_link_tokenHash_key" ON "client_login_link"("tokenHash");

-- CreateIndex
CREATE INDEX "client_login_link_email_idx" ON "client_login_link"("email");

-- CreateIndex
CREATE INDEX "client_login_link_expiresAt_idx" ON "client_login_link"("expiresAt");

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_item" ADD CONSTRAINT "approval_item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_session" ADD CONSTRAINT "client_session_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
