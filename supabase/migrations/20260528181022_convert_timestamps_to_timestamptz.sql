
ALTER TABLE "AIConversation"
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "BrokerConnection"
  ALTER COLUMN "lastSyncAt" TYPE timestamptz USING "lastSyncAt" AT TIME ZONE 'UTC';

ALTER TABLE "BrokerEvent"
  ALTER COLUMN "processedAt" TYPE timestamptz USING "processedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "receivedAt"  TYPE timestamptz USING "receivedAt"  AT TIME ZONE 'UTC';

ALTER TABLE "Order"
  ALTER COLUMN "executedAt" TYPE timestamptz USING "executedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "orderTime"  TYPE timestamptz USING "orderTime"  AT TIME ZONE 'UTC';

ALTER TABLE "Trade"
  ALTER COLUMN "closedAt"         TYPE timestamptz USING "closedAt"         AT TIME ZONE 'UTC',
  ALTER COLUMN "lastPriceUpdateAt" TYPE timestamptz USING "lastPriceUpdateAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "openedAt"         TYPE timestamptz USING "openedAt"         AT TIME ZONE 'UTC';

ALTER TABLE "User"
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';
