-- Adds broker-sync staleness to the admin health snapshot.
--
-- Motivation: the GitHub-Actions cron POSTed a redirecting SITE_URL for two
-- months. Every run went green (curl -f ignores 3xx) while the route never ran,
-- so no sync happened and nothing surfaced it. HTTP-level assertions in the
-- workflow catch that specific bug; these fields catch the whole class by
-- measuring the outcome (did a sync actually land?) instead of the transport.
--
-- Signature unchanged (no args, returns jsonb) — lib/db/types.ts is unaffected.
CREATE OR REPLACE FUNCTION public.admin_system_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Active connections whose last successful-or-failed sync is older than the
    -- 2x-daily cadence tolerates (48h = 4 missed slots), NULL included: a
    -- connection that never synced is the worst case, not an exempt one.
    'staleSyncConnections', (SELECT COUNT(*) FROM "BrokerConnection"
                              WHERE "isActive" = true
                                AND ("lastSyncAt" IS NULL OR "lastSyncAt" < now() - interval '48 hours')),
    'brokerSyncErrors',     (SELECT COUNT(*) FROM "BrokerConnection"
                              WHERE "isActive" = true AND "lastSyncStatus" = 'ERROR'),
    'lastBrokerSyncAt',     (SELECT MAX("lastSyncAt") FROM "BrokerConnection" WHERE "isActive" = true),
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
$function$;