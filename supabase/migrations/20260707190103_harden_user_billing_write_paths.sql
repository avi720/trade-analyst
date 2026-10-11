-- X1 (SECURITY-AUDIT-LAUNCH.md): correct implementation.
--
-- Prior migration (20260707185527) attempted:
--   REVOKE INSERT, UPDATE (col1..col5) FROM authenticated, anon
-- Postgres parses that as (INSERT) + (UPDATE cols) — the INSERT was
-- interpreted as table-level, which stripped ALL insert capability from
-- authenticated. That broke the signup flow (app/(dashboard)/layout.tsx and
-- /api/auth/signup-complete both insert the User row through the
-- authenticated client). The UPDATE(cols) piece had no effect because
-- table-level UPDATE was still granted and shadows column-level revokes.
--
-- This migration fixes both problems atomically:
--   1. Restores INSERT — but only on the columns signup actually needs.
--      Billing columns get their DB default (subscriptionTier='Free') and
--      cannot be seeded by the authenticated client, closing the vector
--      where a signup payload could pre-set tier='Pro'.
--   2. Revokes table-level UPDATE from authenticated + anon.
--   3. Re-grants UPDATE only on user-editable profile columns.
--   4. Belt-and-suspenders: anon loses DELETE/TRUNCATE/TRIGGER/REFERENCES
--      it never legitimately used (RLS blocked it anyway).
--
-- Service-role (webhook, cron, admin scripts) is unaffected — it bypasses
-- column grants.

-- (1) Restore INSERT for authenticated, scoped to signup-touched columns.
GRANT INSERT ("id", "email", "name", "firstName", "lastName", "phone", "addressStreet", "addressCity", "addressCountry", "settings")
  ON public."User"
  TO authenticated;

-- (2) Revoke table-level UPDATE + belt-and-suspenders.
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public."User" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public."User" FROM anon;

-- (3) Grant UPDATE only on profile columns the /api/profile PATCH is allowed to touch.
GRANT UPDATE ("name", "firstName", "lastName", "phone", "addressStreet", "addressCity", "addressCountry", "settings")
  ON public."User"
  TO authenticated;

-- (4) Explicitly re-grant SELECT (unchanged, but stated for clarity — read is fine, RLS gates rows).
GRANT SELECT ON public."User" TO authenticated;