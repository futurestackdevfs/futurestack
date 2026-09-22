-- Add new columns first (nullable-safe defaults), backfill from the old
-- single-answer column, then drop it.
ALTER TABLE "QuizQuestion" ADD COLUMN "correctIndices" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "QuizQuestion" ADD COLUMN "isMultiSelect" BOOLEAN NOT NULL DEFAULT false;

UPDATE "QuizQuestion" SET "correctIndices" = ARRAY["correctIndex"] WHERE "correctIndex" IS NOT NULL;

ALTER TABLE "QuizQuestion" DROP COLUMN "correctIndex";
