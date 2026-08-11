-- Rename the revenue-split config from "platform cut" to "trainer share".
-- Semantics: trainer keeps trainerSharePercent% of gross; platform gets the rest.
ALTER TABLE "PaymentSettings" RENAME COLUMN "platformCutPercent" TO "trainerSharePercent";
ALTER TABLE "PaymentSettings" ALTER COLUMN "trainerSharePercent" SET DEFAULT 50;
ALTER TABLE "User" RENAME COLUMN "platformCutPercent" TO "trainerSharePercent";
