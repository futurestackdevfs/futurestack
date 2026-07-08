-- CreateEnum
CREATE TYPE "MessageTag" AS ENUM ('DOUBT', 'TIP', 'ANNOUNCEMENT', 'RESOURCE');

-- CreateTable
CREATE TABLE "CourseDiscussion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tag" "MessageTag" NOT NULL DEFAULT 'DOUBT',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseDiscussionReply" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseDiscussionReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionUpvote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT,
    "replyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionUpvote_userId_messageId_key" ON "DiscussionUpvote"("userId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionUpvote_userId_replyId_key" ON "DiscussionUpvote"("userId", "replyId");

-- AddForeignKey
ALTER TABLE "CourseDiscussion" ADD CONSTRAINT "CourseDiscussion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussion" ADD CONSTRAINT "CourseDiscussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussionReply" ADD CONSTRAINT "CourseDiscussionReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CourseDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussionReply" ADD CONSTRAINT "CourseDiscussionReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionUpvote" ADD CONSTRAINT "DiscussionUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionUpvote" ADD CONSTRAINT "DiscussionUpvote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CourseDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionUpvote" ADD CONSTRAINT "DiscussionUpvote_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "CourseDiscussionReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
