-- AlterTable
ALTER TABLE "technicians" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "technician_reviews" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technician_reviews_technicianId_authorId_key" ON "technician_reviews"("technicianId", "authorId");

-- CreateIndex
CREATE INDEX "technician_reviews_technicianId_idx" ON "technician_reviews"("technicianId");

-- AddForeignKey
ALTER TABLE "technician_reviews" ADD CONSTRAINT "technician_reviews_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_reviews" ADD CONSTRAINT "technician_reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
