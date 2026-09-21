-- Protect financial/audit trail records from being silently destroyed when a
-- User row is deleted. Was ON DELETE CASCADE — a user delete would wipe their
-- Enrollments, Orders, Invoices, Certificates and Refunds. Now the DB blocks
-- deleting a user who still has any of these records (app should soft-delete
-- via User.isActive instead of hard-deleting).

ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_studentId_fkey";
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_studentId_fkey";
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" DROP CONSTRAINT "Refund_studentId_fkey";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" DROP CONSTRAINT "Refund_initiatedById_fkey";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_initiatedById_fkey"
  FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
