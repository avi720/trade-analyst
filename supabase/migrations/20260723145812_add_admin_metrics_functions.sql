-- Phase 4: admin health dashboard RPCs.
-- Three SECURITY DEFINER STABLE functions that self-gate on public.is_admin(auth.uid()).
-- Reads all tables (bypasses RLS via SECURITY DEFINER); the gate is what protects data.

-- 1) admin_system_metrics() — one JSON snapshot for the cards.
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
  IF NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  SELECT jsonb_build_object(
    -- Users
    'usersTotal',       (SELECT COUNT(*)                       FROM "User"),
    'usersPro',         (SELECT COUNT(*) FILTER (WHERE "subscriptionTier" = 'Pro')  FROM "User"),
    'usersFree',        (SELECT COUNT(*) FILTER (WHERE "subscriptionTier" = 'Free' OR "subscriptionTier" IS NULL) FROM "User"),
    'usersSignups7d',   (SELECT COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days') FROM "User"),

    -- Retention: active = has an Order in last 14 days, cohort denominator = users signed up >= N days ago.
    'retention30d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '30 days'),
    'retention30d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u
                              JOIN "Order" o ON o."userId" = u.id
                              WHERE u."createdAt" <= now() - interval '30 days'
                                AND o."executedAt" >= now() - interval '14 days'),
    'retention60d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '60 days'),
    'retention60d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u
                              JOIN "Order" o ON o."userId" = u.id
                              WHERE u."createdAt" <= now() - interval '60 days'
                                AND o."executedAt" >= now() - interval '14 days'),
    'retention90d_eligible', (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" <= now() - interval '90 days'),
    'retention90d_active',   (SELECT COUNT(DISTINCT u.id) FROM "User" u
                              JOIN "Order" o ON o."userId" = u.id
                              WHERE u."createdAt" <= now() - interval '90 days'
                                AND o."executedAt" >= now() - interval '14 days'),

    -- Activity
    'tradesTotal',   (SELECT COUNT(*) FROM "Trade"),
    'tradesOpen',    (SELECT COUNT(*) FILTER (WHERE "status" = 'Open')   FROM "Trade"),
    'tradesClosed',  (SELECT COUNT(*) FILTER (WHERE "status" = 'Closed') FROM "Trade"),
    'trades7d',      (SELECT COUNT(*) FILTER (WHERE "openedAt" >= now() - interval '7 days') FROM "Trade"),
    'ordersTotal',   (SELECT COUNT(*) FROM "Order"),
    'orders7d',      (SELECT COUNT(*) FILTER (WHERE "executedAt" >= now() - interval '7 days') FROM "Order"),

    -- Integrations
    'brokerConnectionsActive', (SELECT COUNT(*) FILTER (WHERE "isActive" = true) FROM "BrokerConnection"),
    'jobsPending', (SELECT COUNT(*) FILTER (WHERE "status" IN ('PENDING','PARSING','AI_MAPPING','IMPORTING','AWAITING_CONFIRMATION')) FROM "ExcelImportJob"),
    'jobsFailed',  (SELECT COUNT(*) FILTER (WHERE "status" = 'FAILED') FROM "ExcelImportJob"),

    -- IBKR sync success rate 7d
    'ibkrSyncTotal7d',   (SELECT COUNT(*) FROM "BrokerEvent" WHERE "source" = 'IBKR_FLEX' AND "receivedAt" >= now() - interval '7 days'),
    'ibkrSyncSuccess7d', (SELECT COUNT(*) FROM "BrokerEvent" WHERE "source" = 'IBKR_FLEX' AND "receivedAt" >= now() - interval '7 days' AND "processingStatus" = 'PROCESSED'),

    -- Chat usage (AIConversation.updatedAt window)
    'chatConversations24h', (SELECT COUNT(*)         FROM "AIConversation" WHERE "updatedAt" >= now() - interval '24 hours'),
    'chatConversations7d',  (SELECT COUNT(*)         FROM "AIConversation" WHERE "updatedAt" >= now() - interval '7 days'),
    'chatActiveUsers24h',   (SELECT COUNT(DISTINCT "userId") FROM "AIConversation" WHERE "updatedAt" >= now() - interval '24 hours'),
    'chatActiveUsers7d',    (SELECT COUNT(DISTINCT "userId") FROM "AIConversation" WHERE "updatedAt" >= now() - interval '7 days'),

    -- Health
    'auditFailures24h', (SELECT COUNT(*) FROM "AuditEvent" WHERE "status" = 'failure' AND "createdAt" >= now() - interval '24 hours')
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_system_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_system_metrics() TO authenticated, service_role;


-- 2) admin_table_sizes() — DB footprint for the tables the admin cares about.
CREATE OR REPLACE FUNCTION public.admin_table_sizes()
RETURNS TABLE ("tableName" text, "sizeBytes" bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  RETURN QUERY
    SELECT t.name::text AS "tableName",
           pg_total_relation_size(('public."' || t.name || '"')::regclass)::bigint AS "sizeBytes"
    FROM (VALUES
      ('User'),
      ('Trade'),
      ('Order'),
      ('BrokerEvent'),
      ('ExcelImportJob'),
      ('AuditEvent'),
      ('BillingWebhookEvent')
    ) AS t(name)
    ORDER BY "sizeBytes" DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_table_sizes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_table_sizes() TO authenticated, service_role;


-- 3) admin_timeseries(days) — daily signups + trades opened for last N days.
--    Uses generate_series so days with zero activity still show as 0.
CREATE OR REPLACE FUNCTION public.admin_timeseries(days integer DEFAULT 30)
RETURNS TABLE ("day" date, "signups" bigint, "trades" bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin((SELECT auth.uid())) THEN
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

REVOKE ALL ON FUNCTION public.admin_timeseries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(integer) TO authenticated, service_role;