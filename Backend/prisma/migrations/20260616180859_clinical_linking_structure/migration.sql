/*
  Warnings:

  - Added the required column `departmentId` to the `HospitalUnit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `HospitalWard` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HospitalDepartment_active_idx";

-- DropIndex
DROP INDEX "HospitalDepartment_deletedAt_idx";

-- DropIndex
DROP INDEX "HospitalUnit_active_idx";

-- DropIndex
DROP INDEX "HospitalUnit_deletedAt_idx";

-- DropIndex
DROP INDEX "HospitalWard_active_idx";

-- DropIndex
DROP INDEX "HospitalWard_deletedAt_idx";

-- AlterTable
ALTER TABLE "HospitalUnit" ADD COLUMN     "departmentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HospitalWard" ADD COLUMN     "unitId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "HospitalUnit_departmentId_idx" ON "HospitalUnit"("departmentId");

-- CreateIndex
CREATE INDEX "HospitalWard_unitId_idx" ON "HospitalWard"("unitId");

-- AddForeignKey
ALTER TABLE "HospitalWard" ADD CONSTRAINT "HospitalWard_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "HospitalUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalUnit" ADD CONSTRAINT "HospitalUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HospitalDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
