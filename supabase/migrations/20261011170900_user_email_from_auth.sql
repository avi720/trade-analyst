-- "User".email is copied from auth.users on every insert; the value the client sends is
-- ignored. The authenticated role holds column-level INSERT on "User".email and
-- users_own_row only checks id, so a user could create their own row with any address —
-- including one belonging to someone who has not signed up yet, whose own insert then fails
-- on "User_email_key" and leaves them stuck in the signup funnel. auth.users.email is unique
-- (users_email_partial_key), so the copied value cannot collide.
--
-- UPDATE needs no trigger: authenticated has no UPDATE grant on email; only the
-- service-role change-email route writes it.

CREATE OR REPLACE FUNCTION public.user_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  auth_email text;
BEGIN
  -- Assign unconditionally, even NULL. ExecInsert runs BEFORE triggers, then RLS WITH CHECK,
  -- then NOT NULL, so:
  --   * someone else's id, registered or not, fails RLS with 42501 — no way to probe ids;
  --   * your own id with no email in auth.users (phone / anonymous sign-in) fails NOT NULL
  --     with 23502 instead of keeping the address the client sent.
  -- Do not raise or return early when auth_email is NULL: raising runs before RLS and
  -- answers differently for unregistered ids, and returning early keeps the client value.
  SELECT u.email INTO auth_email FROM auth.users u WHERE u.id = NEW.id;
  NEW.email := auth_email;
  RETURN NEW;
END;
$$;

-- Firing a trigger does not check EXECUTE (only CREATE TRIGGER does), so nobody but the
-- owner needs it — and anon/authenticated would otherwise get it by Supabase's defaults.
REVOKE ALL ON FUNCTION public.user_email_from_auth() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS user_email_from_auth ON public."User";
CREATE TRIGGER user_email_from_auth
  BEFORE INSERT ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.user_email_from_auth();
