-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "skillTestId" TEXT;

-- AlterTable
ALTER TABLE "SkillTest" ADD COLUMN     "courseId" TEXT;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_skillTestId_fkey" FOREIGN KEY ("skillTestId") REFERENCES "SkillTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTest" ADD CONSTRAINT "SkillTest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

