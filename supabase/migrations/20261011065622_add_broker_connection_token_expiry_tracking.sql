ALTER TABLE "BrokerConnection" ADD COLUMN IF NOT EXISTS "tokenConnectedAt" timestamptz;
ALTER TABLE "BrokerConnection" ADD COLUMN IF NOT EXISTS "tokenExpiryReminderDays" smallint;

COMMENT ON COLUMN "BrokerConnection"."tokenConnectedAt" IS
  'When the current IBRIT token was first connected. IBKR tokens are valid for 1 year, so expiry reminders count from here. Reset only when a different token is saved.';
COMMENT ON COLUMN "BrokerConnection"."tokenExpiryReminderDays" IS
  'Smallest days-before-expiry reminder already emailed for the current token (7 or 1); null when none. Reset together with tokenConnectedAt.';
