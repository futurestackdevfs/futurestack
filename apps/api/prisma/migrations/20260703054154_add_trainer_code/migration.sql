/*
  Warnings:

  - A unique constraint covering the columns `[trainerCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trainerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_trainerCode_key" ON "User"("trainerCode");
