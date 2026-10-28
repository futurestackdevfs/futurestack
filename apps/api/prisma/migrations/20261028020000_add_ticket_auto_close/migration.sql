-- AlterTable
ALTER TABLE "EscalationSettings" ADD COLUMN "ticketAutoCloseDays" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "closedReason" TEXT;

-- Tickets that were already closed before this column existed: closed by hand.
UPDATE "SupportTicket" SET "closedReason" = 'AGENT' WHERE "status" = 'CLOSED' AND "closedReason" IS NULL;
