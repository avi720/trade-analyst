ALTER TABLE "BrokerConnection"
  DROP COLUMN IF EXISTS "lastBackfillAt",
  DROP COLUMN IF EXISTS "lastBackfillStatus",
  DROP COLUMN IF EXISTS "lastBackfillError";