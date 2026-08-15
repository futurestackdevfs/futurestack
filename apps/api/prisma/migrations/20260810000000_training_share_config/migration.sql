-- Add platform cut configuration (admin-controlled % the platform keeps)
-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN "platformCutPercent" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformCutPercent" INTEGER;