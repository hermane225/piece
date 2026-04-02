-- AlterTable
ALTER TABLE "users"
ADD COLUMN "resetPasswordToken" TEXT,
ADD COLUMN "resetPasswordExpiresAt" TIMESTAMP(3);
