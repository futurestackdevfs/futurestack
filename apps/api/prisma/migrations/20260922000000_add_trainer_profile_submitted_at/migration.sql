-- Marks when a trainer completes the required-fields onboarding form (first
-- login gate). Null = onboarding not done yet.
ALTER TABLE "User" ADD COLUMN "profileSubmittedAt" TIMESTAMP(3);
