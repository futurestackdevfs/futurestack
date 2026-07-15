-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "score" INTEGER,
    "rank" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_credentialId_key" ON "Certificate"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_studentId_courseId_key" ON "Certificate"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
