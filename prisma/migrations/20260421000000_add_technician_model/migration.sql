-- CreateEnum
CREATE TYPE "TechnicianSpecialty" AS ENUM (
    'COMPUTER_REPAIR',
    'PLUMBER',
    'ELECTRICIAN',
    'CARPENTER',
    'AC_TECHNICIAN',
    'APPLIANCES_REPAIR',
    'AUTO_REPAIR',
    'MOTO_REPAIR',
    'SOLAR_INSTALLATION',
    'ELECTRICAL_EQUIPMENT',
    'INDUSTRIAL_EQUIPMENT',
    'GAMING_CONSOLE_REPAIR',
    'OTHER'
);

-- CreateTable
CREATE TABLE
    "technicians" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "specialty" "TechnicianSpecialty" NOT NULL,
        "city" TEXT NOT NULL,
        "email" TEXT,
        "description" TEXT,
        "address" TEXT,
        "certifications" TEXT,
        "yearsOfExperience" INTEGER,
        "hourlyRate" DOUBLE PRECISION,
        "availability" TEXT,
        "status" BOOLEAN NOT NULL DEFAULT true,
        "createdByAdminId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "technicians_phone_key" ON "technicians" ("phone");

-- CreateIndex
CREATE INDEX "technicians_specialty_idx" ON "technicians" ("specialty");

-- CreateIndex
CREATE INDEX "technicians_city_idx" ON "technicians" ("city");

-- CreateIndex
CREATE INDEX "technicians_status_idx" ON "technicians" ("status");

-- CreateIndex
CREATE INDEX "technicians_createdByAdminId_idx" ON "technicians" ("createdByAdminId");

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;