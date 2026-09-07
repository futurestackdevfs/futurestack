-- USD pricing on catalog items (no separate model — columns on existing tables)
ALTER TABLE "Course" ADD COLUMN "priceUsd" DOUBLE PRECISION;
ALTER TABLE "Course" ADD COLUMN "originalPriceUsd" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "priceUsd" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "originalPriceUsd" DOUBLE PRECISION;

-- Payment settings: USD tax rate + fallback FX rate
ALTER TABLE "PaymentSettings" ADD COLUMN "gstPercentUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PaymentSettings" ADD COLUMN "usdRate" DOUBLE PRECISION NOT NULL DEFAULT 84;

-- Order: billing country + settlement signals from the gateway
ALTER TABLE "Order" ADD COLUMN "isInternational" BOOLEAN;
ALTER TABLE "Order" ADD COLUMN "settledCurrency" TEXT;
ALTER TABLE "Order" ADD COLUMN "billingCountry" TEXT;

-- Backfill existing orders as domestic India
UPDATE "Order" SET "billingCountry" = 'IN' WHERE "billingCountry" IS NULL;
