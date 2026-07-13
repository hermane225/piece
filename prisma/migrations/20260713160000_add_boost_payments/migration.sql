-- CreateEnum
CREATE TYPE "BoostPaymentStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

-- CreateTable
CREATE TABLE "boost_payments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "BoostPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "boost_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boost_payments_reference_key" ON "boost_payments" ("reference");

-- CreateIndex
CREATE INDEX "boost_payments_postId_idx" ON "boost_payments" ("postId");

-- CreateIndex
CREATE INDEX "boost_payments_userId_idx" ON "boost_payments" ("userId");

-- CreateIndex
CREATE INDEX "boost_payments_status_idx" ON "boost_payments" ("status");

-- AddForeignKey
ALTER TABLE "boost_payments" ADD CONSTRAINT "boost_payments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_payments" ADD CONSTRAINT "boost_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;