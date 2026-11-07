-- CreateTable
CREATE TABLE "HospitalStaff" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalUnit" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HospitalStaff_hospitalId_idx" ON "HospitalStaff"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalStaff_active_idx" ON "HospitalStaff"("active");

-- CreateIndex
CREATE INDEX "HospitalStaff_deletedAt_idx" ON "HospitalStaff"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalStaff_hospitalId_employeeCode_key" ON "HospitalStaff"("hospitalId", "employeeCode");

-- CreateIndex
CREATE INDEX "HospitalUnit_hospitalId_idx" ON "HospitalUnit"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalUnit_active_idx" ON "HospitalUnit"("active");

-- CreateIndex
CREATE INDEX "HospitalUnit_deletedAt_idx" ON "HospitalUnit"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalUnit_hospitalId_code_key" ON "HospitalUnit"("hospitalId", "code");

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalUnit" ADD CONSTRAINT "HospitalUnit_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
