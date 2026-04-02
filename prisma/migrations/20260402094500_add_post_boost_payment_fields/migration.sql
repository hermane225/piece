-- AlterTable
ALTER TABLE "posts"
ADD COLUMN "boostPaymentReference" TEXT,
ADD COLUMN "boostPaymentAmount" DOUBLE PRECISION,
ADD COLUMN "boostPaidAt" TIMESTAMP(3);
