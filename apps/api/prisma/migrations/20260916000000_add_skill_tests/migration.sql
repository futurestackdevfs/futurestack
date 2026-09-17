-- CreateTable
CREATE TABLE "SkillTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "skillLevel" "SkillLevel",
    "durationMinutes" INTEGER,
    "passingScore" INTEGER,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTestQuestion" (
    "id" TEXT NOT NULL,
    "skillTestId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SkillTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTestAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillTestId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "answers" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillTest_title_key" ON "SkillTest"("title");

-- CreateIndex
CREATE INDEX "SkillTestAttempt_studentId_idx" ON "SkillTestAttempt"("studentId");

-- CreateIndex
CREATE INDEX "SkillTestAttempt_skillTestId_idx" ON "SkillTestAttempt"("skillTestId");

-- AddForeignKey
ALTER TABLE "SkillTestQuestion" ADD CONSTRAINT "SkillTestQuestion_skillTestId_fkey" FOREIGN KEY ("skillTestId") REFERENCES "SkillTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTestAttempt" ADD CONSTRAINT "SkillTestAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTestAttempt" ADD CONSTRAINT "SkillTestAttempt_skillTestId_fkey" FOREIGN KEY ("skillTestId") REFERENCES "SkillTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

