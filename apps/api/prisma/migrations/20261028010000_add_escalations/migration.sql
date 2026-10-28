-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('TRAINER_FLAG', 'SUPPORT_TICKET', 'REFUND', 'PAYMENT', 'CONTENT', 'COMPLAINT', 'COORDINATOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "EscalationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "EscalationType" NOT NULL,
    "severity" "EscalationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "autoRaised" BOOLEAN NOT NULL DEFAULT false,
    "studentId" TEXT,
    "createdById" TEXT,
    "assigneeId" TEXT,
    "orderId" TEXT,
    "ticketId" TEXT,
    "refundId" TEXT,
    "courseId" TEXT,
    "videoId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationEvent" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationSettings" (
    "id" TEXT NOT NULL,
    "ticketSlaHours" INTEGER NOT NULL DEFAULT 48,
    "refundPendingHours" INTEGER NOT NULL DEFAULT 24,
    "paidGraceMinutes" INTEGER NOT NULL DEFAULT 60,
    "complaintMinCount" INTEGER NOT NULL DEFAULT 3,
    "complaintWindowDays" INTEGER NOT NULL DEFAULT 14,
    "coordinatorSlaDays" INTEGER NOT NULL DEFAULT 3,
    "resolveSlaHours" INTEGER NOT NULL DEFAULT 24,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_number_key" ON "Escalation"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_dedupeKey_key" ON "Escalation"("dedupeKey");

-- CreateIndex
CREATE INDEX "Escalation_status_severity_idx" ON "Escalation"("status", "severity");

-- CreateIndex
CREATE INDEX "Escalation_type_idx" ON "Escalation"("type");

-- CreateIndex
CREATE INDEX "Escalation_assigneeId_idx" ON "Escalation"("assigneeId");

-- CreateIndex
CREATE INDEX "Escalation_studentId_idx" ON "Escalation"("studentId");

-- CreateIndex
CREATE INDEX "Escalation_dueAt_idx" ON "Escalation"("dueAt");

-- CreateIndex
CREATE INDEX "EscalationEvent_escalationId_createdAt_idx" ON "EscalationEvent"("escalationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationEvent" ADD CONSTRAINT "EscalationEvent_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "Escalation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationEvent" ADD CONSTRAINT "EscalationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

