-- Offline/Cash sales: receipt/screenshot the sales rep uploads before Confirm Payment is allowed
ALTER TABLE "Order" ADD COLUMN "paymentProofUrl" TEXT;
