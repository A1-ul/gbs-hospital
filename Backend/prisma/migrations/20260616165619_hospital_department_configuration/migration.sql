-- CreateTable
CREATE TABLE "HospitalDepartment" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalDepartment_hospitalId_idx" ON "HospitalDepartment"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalDepartment_active_idx" ON "HospitalDepartment"("active");

-- CreateIndex
CREATE INDEX "HospitalDepartment_deletedAt_idx" ON "HospitalDepartment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalDepartment_hospitalId_code_key" ON "HospitalDepartment"("hospitalId", "code");

-- AddForeignKey
ALTER TABLE "HospitalDepartment" ADD CONSTRAINT "HospitalDepartment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
