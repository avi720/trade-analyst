ALTER TABLE "BrokerConnection"
  ADD COLUMN "lastBackfillStatus" TEXT,
  ADD COLUMN "lastBackfillError"  TEXT;