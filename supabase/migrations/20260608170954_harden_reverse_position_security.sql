
-- 1. Drop the unused 5-param overload (zombie from phase2_reverse_position_fn)
DROP FUNCTION IF EXISTS public.reverse_position(
  uuid, jsonb, jsonb, jsonb, jsonb
);

-- 2. Lock search_path on the active 11-param SECURITY DEFINER overload
ALTER FUNCTION public.reverse_position(
  uuid, text, timestamptz, numeric, numeric, text, numeric, numeric, jsonb, jsonb, jsonb
) SET search_path = public, pg_catalog;

-- 3. Revoke EXECUTE from public web roles. The function is invoked from
--    process-executions.ts via the service-role admin client, which keeps its
--    grant (default-owner privileges) and bypasses these revokes.
REVOKE EXECUTE ON FUNCTION public.reverse_position(
  uuid, text, timestamptz, numeric, numeric, text, numeric, numeric, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
