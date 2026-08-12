-- GST support:
-- 1. PaymentSettings gets an admin-configurable GST rate applied to every fee.
-- 2. Orders snapshot the rate + amount at purchase time so past invoices stay
--    correct even if the admin later changes the rate.

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;