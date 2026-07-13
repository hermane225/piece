-- AlterEnum
ALTER TYPE "BoostPaymentStatus" ADD VALUE 'REFUNDED';

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events" ("provider", "eventId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_eventName_idx" ON "webhook_events" ("provider", "eventName");