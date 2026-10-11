-- The naive EXISTS(...) form of admins_select_all_users caused infinite
-- recursion (the subquery on "User" re-triggers the same RLS policy). Fix
-- with a SECURITY DEFINER helper that reads the flag with RLS disabled and
-- rewrite the policy to call it.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT "isAdmin" FROM "User" WHERE id = uid), false);
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "admins_select_all_users" ON "User";
CREATE POLICY "admins_select_all_users" ON "User"
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));