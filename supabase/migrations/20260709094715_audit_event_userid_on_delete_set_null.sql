-- X21 follow-up: the account_deleted audit row was cascade-removed when the
-- User row was deleted, defeating the audit trail's purpose. Change the FK
-- from ON DELETE CASCADE to ON DELETE SET NULL and make userId nullable so
-- audit rows for deleted users survive with metadata.email intact.
--
-- The existing RLS policy (auth.uid() = "userId") continues to work — a NULL
-- userId matches no user, so orphaned rows are only visible via service-role
-- (the admin client used by logAuditEvent + any internal audit dashboards).

ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_userId_fkey";

ALTER TABLE "AuditEvent" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;