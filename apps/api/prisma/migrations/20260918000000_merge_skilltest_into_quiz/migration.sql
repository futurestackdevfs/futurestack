-- Merge the standalone SkillTest feature into Quiz.
-- Quiz.sectionId becomes nullable (standalone quizzes have no section).
-- Quiz.skillTestId / SkillTest relation is dropped.
-- QuizQuestion replaces SkillTestQuestion, owned by Quiz.
-- QuizAttempt gains totalQuestions/correctCount/isPassed/answers and drops
-- its per-student-per-quiz unique constraint (multiple attempts allowed).
-- SkillTest, SkillTestQuestion, SkillTestAttempt are dropped entirely.

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT IF EXISTS "Quiz_skillTestId_fkey";
ALTER TABLE "Quiz" DROP CONSTRAINT IF EXISTS "Quiz_sectionId_fkey";
ALTER TABLE "SkillTest" DROP CONSTRAINT IF EXISTS "SkillTest_courseId_fkey";
ALTER TABLE "SkillTestQuestion" DROP CONSTRAINT IF EXISTS "SkillTestQuestion_skillTestId_fkey";
ALTER TABLE "SkillTestAttempt" DROP CONSTRAINT IF EXISTS "SkillTestAttempt_studentId_fkey";
ALTER TABLE "SkillTestAttempt" DROP CONSTRAINT IF EXISTS "SkillTestAttempt_skillTestId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "QuizAttempt_studentId_quizId_key";

-- AlterTable: Quiz — drop skillTestId, make sectionId nullable
ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "skillTestId";
ALTER TABLE "Quiz" ALTER COLUMN "sectionId" DROP NOT NULL;

-- AlterTable: QuizAttempt — add scoring/answers columns
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "totalQuestions" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "correctCount" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "isPassed" BOOLEAN;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "answers" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuizAttempt_studentId_idx" ON "QuizAttempt"("studentId");
CREATE INDEX IF NOT EXISTS "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- Re-add Quiz.sectionId FK as optional (SET NULL not applicable since column
-- is now nullable but we keep cascade-on-section-delete semantics)
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: QuizQuestion (replaces SkillTestQuestion)
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable: old standalone SkillTest catalog (data not migrated — see note below)
DROP TABLE IF EXISTS "SkillTestAttempt";
DROP TABLE IF EXISTS "SkillTestQuestion";
DROP TABLE IF EXISTS "SkillTest";
