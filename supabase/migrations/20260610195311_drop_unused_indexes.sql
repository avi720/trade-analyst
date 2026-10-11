-- Drop two indexes that pg_stat_user_indexes reports as never scanned
-- (idx_scan = 0). Code search confirmed no references to these names.
-- Both can be recreated with `CREATE INDEX CONCURRENTLY` if perf regresses.
DROP INDEX IF EXISTS public."Trade_userId_status_idx";
DROP INDEX IF EXISTS public."BrokerEvent_processingStatus_idx";