-- Add isAdmin flag for the in-app admin panel gate.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false;

-- Admins can SELECT any User row so the admin users list works under RLS.
-- Writes to billing columns remain blocked for the authenticated role by the
-- earlier harden_user_billing_write_paths migration; admin toggles go through
-- the service-role client, which bypasses RLS entirely — so no policy change
-- is needed for writes.
DROP POLICY IF EXISTS "admins_select_all_users" ON "User";
CREATE POLICY "admins_select_all_users" ON "User"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (SELECT auth.uid()) AND u."isAdmin" = true
    )
  );