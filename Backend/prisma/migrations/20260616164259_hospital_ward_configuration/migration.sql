-- CreateTable
CREATE TABLE "HospitalWard" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalWard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalWard_hospitalId_idx" ON "HospitalWard"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalWard_active_idx" ON "HospitalWard"("active");

-- CreateIndex
CREATE INDEX "HospitalWard_deletedAt_idx" ON "HospitalWard"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalWard_hospitalId_code_key" ON "HospitalWard"("hospitalId", "code");

-- AddForeignKey
ALTER TABLE "HospitalWard" ADD CONSTRAINT "HospitalWard_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
