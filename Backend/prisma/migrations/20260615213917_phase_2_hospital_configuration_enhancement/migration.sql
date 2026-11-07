-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HospitalBranch" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HospitalSetting" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Hospital_active_idx" ON "Hospital"("active");

-- CreateIndex
CREATE INDEX "Hospital_deletedAt_idx" ON "Hospital"("deletedAt");

-- CreateIndex
CREATE INDEX "Hospital_country_idx" ON "Hospital"("country");

-- CreateIndex
CREATE INDEX "Hospital_city_idx" ON "Hospital"("city");

-- CreateIndex
CREATE INDEX "HospitalBranch_hospitalId_idx" ON "HospitalBranch"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBranch_active_idx" ON "HospitalBranch"("active");

-- CreateIndex
CREATE INDEX "HospitalBranch_deletedAt_idx" ON "HospitalBranch"("deletedAt");

-- CreateIndex
CREATE INDEX "HospitalSetting_hospitalId_idx" ON "HospitalSetting"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalSetting_deletedAt_idx" ON "HospitalSetting"("deletedAt");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
