-- Rename to the entity/* naming and add actorName / changes / userAgent.
ALTER TABLE "AuditLog" RENAME COLUMN "targetType" TO "entityType";
ALTER TABLE "AuditLog" RENAME COLUMN "targetId" TO "entityId";
ALTER TABLE "AuditLog" RENAME COLUMN "ip" TO "ipAddress";

ALTER TABLE "AuditLog" ADD COLUMN "actorName" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "changes" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
