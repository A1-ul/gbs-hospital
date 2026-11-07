/*
  Warnings:

  - You are about to drop the column `capacity` on the `HospitalRoom` table. All the data in the column will be lost.
  - You are about to drop the column `occupied` on the `HospitalRoom` table. All the data in the column will be lost.
  - Made the column `wardId` on table `HospitalRoom` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "HospitalRoom" DROP CONSTRAINT "HospitalRoom_wardId_fkey";

-- AlterTable
ALTER TABLE "HospitalRoom" DROP COLUMN "capacity",
DROP COLUMN "occupied",
ADD COLUMN     "description" TEXT,
ALTER COLUMN "wardId" SET NOT NULL;

-- CreateTable
CREATE TABLE "HospitalBed" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "bedType" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalBed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalBed_roomId_idx" ON "HospitalBed"("roomId");

-- CreateIndex
CREATE INDEX "HospitalBed_hospitalId_idx" ON "HospitalBed"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalBed_status_idx" ON "HospitalBed"("status");

-- CreateIndex
CREATE INDEX "HospitalBed_active_idx" ON "HospitalBed"("active");

-- CreateIndex
CREATE INDEX "HospitalBed_deletedAt_idx" ON "HospitalBed"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_roomId_code_key" ON "HospitalBed"("roomId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalBed_roomId_bedNumber_key" ON "HospitalBed"("roomId", "bedNumber");

-- AddForeignKey
ALTER TABLE "HospitalRoom" ADD CONSTRAINT "HospitalRoom_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HospitalRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalBed" ADD CONSTRAINT "HospitalBed_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
