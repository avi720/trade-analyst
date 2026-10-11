-- The Phase 4 RPCs are called by the app under createAdminClient() (service_role).
-- Under service_role there's no JWT → auth.uid() is null → is_admin() returns false.
-- Fix: bypass the admin gate for service_role so both authenticated admins and
-- server-side service-role callers can execute. The RSC still checks isAdmin at
-- the page layer before invoking the RPC, so this doesn't widen the surface.

CREATE OR REPLACE FUNCTION public.admin_system_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT jsonb_build_object(
    'usersTotal',       (SELECT COUNT(*)                       FROM "User"),
    'usersPro',         (SELECT COUNT(*) FILTER (WHERE "subscriptionTier" = 'Pro')  FROM "User"),
    'usersFree',        (SELECT COUNT(*) FILTER (WHERE "subscriptionTier" = 'Free' OR "subscriptionTier" IS NULL) FROM "User"),
    'usersSignups7d',   (SELECT COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days') FROM "User"),
    'retention30d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '30 days'),
    'retention30d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u JOIN "Order" o ON o."userId" = u.id WHERE u."createdAt" <= now() - interval '30 days' AND o."executedAt" >= now() - interval '14 days'),
    'retention60d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '60 days'),
    'retention60d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u JOIN "Order" o ON o."userId" = u.id WHERE u."createdAt" <= now() - interval '60 days' AND o."executedAt" >= now() - interval '14 days'),
    'retention90d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '90 days'),
    'retention90d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u JOIN "Order" o ON o."userId" = u.id WHERE u."createdAt" <= now() - interval '90 days' AND o."executedAt" >= now() - interval '14 days'),
    'tradesTotal',   (SELECT COUNT(*) FROM "Trade"),
    'tradesOpen',    (SELECT COUNT(*) FILTER (WHERE "status" = 'Open')   FROM "Trade"),
    'tradesClosed',  (SELECT COUNT(*) FILTER (WHERE "status" = 'Closed') FROM "Trade"),
    'trades7d',      (SELECT COUNT(*) FILTER (WHERE "openedAt" >= now() - interval '7 days') FROM "Trade"),
    'ordersTotal',   (SELECT COUNT(*) FROM "Order"),
    'orders7d',      (SELECT COUNT(*) FILTER (WHERE "executedAt" >= now() - interval '7 days') FROM "Order"),
    'brokerConnectionsActive', (SELECT COUNT(*) FILTER (WHERE "isActive" = true) FROM "BrokerConnection"),
    'jobsPending', (SELECT COUNT(*) FILTER (WHERE "status" IN ('PENDING','PARSING','AI_MAPPING','IMPORTING','AWAITING_CONFIRMATION')) FROM "ExcelImportJob"),
    'jobsFailed',  (SELECT COUNT(*) FILTER (WHERE "status" = 'FAILED') FROM "ExcelImportJob"),
    'ibkrSyncTotal7d',   (SELECT COUNT(*) FROM "BrokerEvent" WHERE "source" = 'IBKR_FLEX' AND "receivedAt" >= now() - interval '7 days'),
    'ibkrSyncSuccess7d', (SELECT COUNT(*) FROM "BrokerEvent" WHERE "source" = 'IBKR_FLEX' AND "receivedAt" >= now() - interval '7 days' AND "processingStatus" = 'PROCESSED'),
    'chatConversations24h', (SELECT COUNT(*)         FROM "AIConversation" WHERE "updatedAt" >= now() - interval '24 hours'),
    'chatConversations7d',  (SELECT COUNT(*)         FROM "AIConversation" WHERE "updatedAt" >= now() - interval '7 days'),
    'chatActiveUsers24h',   (SELECT COUNT(DISTINCT "userId") FROM "AIConversation" WHERE "updatedAt" >= now() - interval '24 hours'),
    'chatActiveUsers7d',    (SELECT COUNT(DISTINCT "userId") FROM "AIConversation" WHERE "updatedAt" >= now() - interval '7 days'),
    'auditFailures24h', (SELECT COUNT(*) FROM "AuditEvent" WHERE "status" = 'failure' AND "createdAt" >= now() - interval '24 hours')
  )
  INTO result;

  RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_table_sizes()
RETURNS TABLE ("tableName" text, "sizeBytes" bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  RETURN QUERY
    SELECT t.name::text AS "tableName",
           pg_total_relation_size(('public."' || t.name || '"')::regclass)::bigint AS "sizeBytes"
    FROM (VALUES
      ('User'), ('Trade'), ('Order'), ('BrokerEvent'),
      ('ExcelImportJob'), ('AuditEvent'), ('BillingWebhookEvent')
    ) AS t(name)
    ORDER BY "sizeBytes" DESC;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_timeseries(days integer DEFAULT 30)
RETURNS TABLE ("day" date, "signups" bigint, "trades" bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  IF days IS NULL OR days < 1 OR days > 365 THEN
    RAISE EXCEPTION 'invalid_days';
  END IF;

  RETURN QUERY
    WITH day_bucket AS (
      SELECT generate_series(
        (now()::date - (days - 1)),
        now()::date,
        interval '1 day'
      )::date AS "day"
    ),
    signup_counts AS (
      SELECT "createdAt"::date AS "day", COUNT(*)::bigint AS "signups"
      FROM "User"
      WHERE "createdAt" >= now() - make_interval(days => days)
      GROUP BY 1
    ),
    trade_counts AS (
      SELECT "openedAt"::date AS "day", COUNT(*)::bigint AS "trades"
      FROM "Trade"
      WHERE "openedAt" >= now() - make_interval(days => days)
      GROUP BY 1
    )
    SELECT db."day",
           COALESCE(s."signups", 0) AS "signups",
           COALESCE(t."trades",  0) AS "trades"
    FROM day_bucket db
    LEFT JOIN signup_counts s ON s."day" = db."day"
    LEFT JOIN trade_counts  t ON t."day" = db."day"
    ORDER BY db."day" ASC;
END;
$$;