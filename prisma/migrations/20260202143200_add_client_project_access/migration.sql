-- CreateTable
CREATE TABLE "client_project_access" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_project_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_project_access_projectId_idx" ON "client_project_access"("projectId");

-- CreateIndex
CREATE INDEX "client_project_access_clientId_idx" ON "client_project_access"("clientId");

-- CreateIndex
CREATE INDEX "client_project_access_revokedAt_idx" ON "client_project_access"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_project_access_clientId_projectId_key" ON "client_project_access"("clientId", "projectId");

-- AddForeignKey
ALTER TABLE "client_project_access" ADD CONSTRAINT "client_project_access_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_project_access" ADD CONSTRAINT "client_project_access_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_project_access" ADD CONSTRAINT "client_project_access_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
