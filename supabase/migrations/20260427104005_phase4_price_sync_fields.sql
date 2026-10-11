ALTER TABLE "BrokerConnection"
  ADD COLUMN "lastPriceSyncAt"     TIMESTAMPTZ,
  ADD COLUMN "lastPriceSyncStatus" TEXT;