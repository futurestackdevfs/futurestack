-- AlterEnum
ALTER TYPE "RefundStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN "cancelledById" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
