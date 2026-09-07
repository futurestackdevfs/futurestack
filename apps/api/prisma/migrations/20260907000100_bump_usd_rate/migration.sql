-- The seeded fallback USD rate (₹84/$) was stale — spot is ~₹94.4/$. Move the
-- DB-level default up to ₹95 (the app seeds fresh rows from the DEFAULT_USD_RATE
-- env var; this is only the raw safety net).
ALTER TABLE "PaymentSettings" ALTER COLUMN "usdRate" SET DEFAULT 95;

-- Bump only rows still sitting on the old default — never clobber a rate the
-- admin has customised in Payment Settings.
UPDATE "PaymentSettings" SET "usdRate" = 95 WHERE "usdRate" = 84;
