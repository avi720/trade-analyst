-- ============================================================
-- User — id is UUID (matches Supabase auth.uid() type exactly)
-- ============================================================
CREATE TABLE "User" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "email"     TEXT         NOT NULL,
  "name"      TEXT,
  "settings"  JSONB        NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ============================================================
-- BrokerConnection
-- ============================================================
CREATE TABLE "BrokerConnection" (
  "id"                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"                  UUID        NOT NULL,
  "brokerName"              TEXT        NOT NULL,
  "accountId"               TEXT,
  "flexTokenEncrypted"      TEXT        NOT NULL,
  "flexQueryIdTrades"       TEXT        NOT NULL,
  "flexQueryIdActivity"     TEXT        NOT NULL,
  "pollingIntervalMin"      INTEGER     NOT NULL DEFAULT 15,
  "pricePollingIntervalMin" INTEGER     NOT NULL DEFAULT 15,
  "lastSyncAt"              TIMESTAMP(3),
  "lastSyncStatus"          TEXT,
  "lastSyncError"           TEXT,
  "lastBackfillAt"          TIMESTAMP(3),
  "isActive"                BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT "BrokerConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BrokerConnection_userId_key" ON "BrokerConnection"("userId");
ALTER TABLE "BrokerConnection"
  ADD CONSTRAINT "BrokerConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Trade
-- ============================================================
CREATE TABLE "Trade" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"              UUID         NOT NULL,
  "ticker"              TEXT         NOT NULL,
  "assetType"           TEXT         NOT NULL DEFAULT 'STK',
  "direction"           TEXT         NOT NULL,
  "status"              TEXT         NOT NULL,
  "setupType"           TEXT,
  "openedAt"            TIMESTAMP(3) NOT NULL,
  "closedAt"            TIMESTAMP(3),
  "avgEntryPrice"       NUMERIC      NOT NULL,
  "avgExitPrice"        NUMERIC,
  "totalQuantity"       NUMERIC      NOT NULL,
  "totalQuantityOpened" NUMERIC      NOT NULL,
  "multiplier"          INTEGER      NOT NULL DEFAULT 1,
  "stopPrice"           NUMERIC,
  "targetPrice"         NUMERIC,
  "rMultipleEntry"      NUMERIC,
  "actualR"             NUMERIC,
  "realizedPnl"         NUMERIC,
  "totalCommission"     NUMERIC,
  "lastKnownPrice"      NUMERIC,
  "lastPriceUpdateAt"   TIMESTAMP(3),
  "executionQuality"    INTEGER,
  "emotionalState"      TEXT,
  "result"              TEXT,
  "didRight"            TEXT,
  "wouldChange"         TEXT,
  "notes"               TEXT,
  "externalRefId"       TEXT,
  CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Trade_userId_status_idx" ON "Trade"("userId", "status");
CREATE INDEX "Trade_userId_ticker_idx" ON "Trade"("userId", "ticker");
ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Order — userId denormalized for O(1) RLS (no subquery join)
-- ============================================================
CREATE TABLE "Order" (
  "id"                    UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tradeId"               UUID         NOT NULL,
  "userId"                UUID         NOT NULL,
  "side"                  TEXT         NOT NULL,
  "quantity"              NUMERIC      NOT NULL,
  "price"                 NUMERIC      NOT NULL,
  "proceeds"              NUMERIC,
  "netCash"               NUMERIC,
  "commission"            NUMERIC,
  "commissionCurrency"    TEXT,
  "tax"                   NUMERIC,
  "currency"              TEXT,
  "exchange"              TEXT,
  "orderType"             TEXT,
  "executedAt"            TIMESTAMP(3) NOT NULL,
  "orderTime"             TIMESTAMP(3),
  "tradeDate"             TIMESTAMP(3),
  "brokerExecId"          TEXT         NOT NULL,
  "brokerOrderId"         TEXT,
  "brokerTradeId"         TEXT,
  "brokerClientAccountId" TEXT,
  "rawPayload"            JSONB        NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_brokerExecId_key" ON "Order"("brokerExecId");
CREATE INDEX "Order_executedAt_idx"     ON "Order"("executedAt");
CREATE INDEX "Order_brokerOrderId_idx"  ON "Order"("brokerOrderId");
CREATE INDEX "Order_brokerTradeId_idx"  ON "Order"("brokerTradeId");
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_tradeId_fkey"
  FOREIGN KEY ("tradeId") REFERENCES "Trade"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- BrokerEvent
-- ============================================================
CREATE TABLE "BrokerEvent" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"           UUID         NOT NULL,
  "source"           TEXT         NOT NULL,
  "receivedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventType"        TEXT         NOT NULL,
  "rawPayload"       JSONB        NOT NULL,
  "processingStatus" TEXT         NOT NULL,
  "processingError"  TEXT,
  "processedAt"      TIMESTAMP(3),
  CONSTRAINT "BrokerEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BrokerEvent_userId_receivedAt_idx" ON "BrokerEvent"("userId", "receivedAt");
CREATE INDEX "BrokerEvent_processingStatus_idx"  ON "BrokerEvent"("processingStatus");
ALTER TABLE "BrokerEvent"
  ADD CONSTRAINT "BrokerEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- AIConversation
-- ============================================================
CREATE TABLE "AIConversation" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"      UUID         NOT NULL,
  "contextType" TEXT         NOT NULL,
  "messages"    JSONB        NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- _prisma_migrations sentinel row
-- ============================================================
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                  VARCHAR(36)  NOT NULL,
  "checksum"            VARCHAR(64)  NOT NULL,
  "finished_at"         TIMESTAMPTZ,
  "migration_name"      VARCHAR(255) NOT NULL,
  "logs"                TEXT,
  "rolled_back_at"      TIMESTAMPTZ,
  "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "applied_steps_count" INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES
  (gen_random_uuid()::text, 'manual_via_supabase_mcp_phase2_0000000000000000', NOW(), 'phase2_initial_schema', 1);

-- ============================================================
-- RLS — enable on all tables
-- ============================================================
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrokerConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trade"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrokerEvent"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIConversation"   ENABLE ROW LEVEL SECURITY;

-- No cast needed: auth.uid() is UUID, columns are UUID
CREATE POLICY "users_own_row"         ON "User"             FOR ALL USING (auth.uid() = "id");
CREATE POLICY "broker_connection_own" ON "BrokerConnection" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "trades_own"            ON "Trade"            FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "orders_own"            ON "Order"            FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "broker_events_own"     ON "BrokerEvent"      FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "ai_conversations_own"  ON "AIConversation"   FOR ALL USING (auth.uid() = "userId");