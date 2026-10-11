-- The /admin/health page calls these three RPCs through createAdminClient()
-- (service_role), so anon and authenticated never need EXECUTE. They had it only
-- because Supabase's default privileges on the public schema grant EXECUTE on new
-- functions to anon, authenticated and service_role. The functions already self-gate
-- on is_admin(auth.uid()); this closes the door one step earlier and clears the
-- 0028/0029 security advisors.
--
-- public.is_admin(uuid) is deliberately NOT touched: it backs every admins_select_all_*
-- RLS policy, and policy expressions are evaluated with the querying role's privileges,
-- so `authenticated` must keep EXECUTE on it.

REVOKE EXECUTE ON FUNCTION public.admin_system_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_table_sizes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_timeseries(integer) FROM anon, authenticated;

-- Explicit and idempotent: service_role is the only caller that must keep EXECUTE.
GRANT EXECUTE ON FUNCTION public.admin_system_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_table_sizes() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(integer) TO service_role;