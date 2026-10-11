-- Retention: delete BrokerEvent rows older than 90 days.
-- Runs daily at 04:00 UTC (well outside the IBKR sync windows at 13:00 & 20:00 UTC).
-- Idempotent: unschedule any prior job with the same name before rescheduling.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-broker-events') THEN
    PERFORM cron.unschedule('purge-broker-events');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-broker-events',
  '0 4 * * *',
  $job$ DELETE FROM "BrokerEvent" WHERE "receivedAt" < now() - interval '90 days' $job$
);