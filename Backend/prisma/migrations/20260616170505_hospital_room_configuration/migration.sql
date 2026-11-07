-- CreateTable
CREATE TABLE "HospitalRoom" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "wardId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roomType" TEXT,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalRoom_hospitalId_idx" ON "HospitalRoom"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalRoom_wardId_idx" ON "HospitalRoom"("wardId");

-- CreateIndex
CREATE INDEX "HospitalRoom_active_idx" ON "HospitalRoom"("active");

-- CreateIndex
CREATE INDEX "HospitalRoom_deletedAt_idx" ON "HospitalRoom"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalRoom_hospitalId_code_key" ON "HospitalRoom"("hospitalId", "code");

-- AddForeignKey
ALTER TABLE "HospitalRoom" ADD CONSTRAINT "HospitalRoom_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalRoom" ADD CONSTRAINT "HospitalRoom_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "HospitalWard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
