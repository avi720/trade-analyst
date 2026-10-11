-- X19 (SECURITY-AUDIT-LAUNCH.md): enforce the TS union at the DB layer too.
--
-- lib/audit/log.ts exports an `AuditEventType` union with these values.
-- Compile-time enforcement is fine inside the app but any direct SQL write
-- (data migration, ad-hoc script, future test) could insert a bogus value
-- silently. Add a CHECK constraint that matches the TS union.
--
-- Values must stay in lockstep with `AuditEventType` in lib/audit/log.ts.
-- When adding a new event type: update both files in the same PR.
--
-- `subscription_orphaned` was added in the Phase 2 X14 fix — it's included
-- here from the start.

ALTER TABLE public."AuditEvent"
  ADD CONSTRAINT audit_event_type_check
  CHECK (
    "eventType" IN (
      'password_changed',
      'email_changed',
      'account_deleted',
      'reauth_failed',
      'rate_limit_hit',
      'tier_upgraded',
      'tier_downgraded',
      'subscription_updated',
      'subscription_orphaned'
    )
  );