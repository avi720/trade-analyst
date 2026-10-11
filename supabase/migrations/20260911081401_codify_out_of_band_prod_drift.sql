-- Codify three schema changes that were made directly on production, outside the
-- migration history. Replaying the migration list onto an empty project (to build
-- the Trade-Analysis-dev preview DB) produced a schema that diverged from
-- production on exactly these points. Idempotent: a no-op on production, where all
-- three are already in this state.

-- 1. FK-covering indexes that were created by hand.
CREATE INDEX IF NOT EXISTS "AIConversation_userId_idx" ON public."AIConversation" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "Order_tradeId_idx" ON public."Order" USING btree ("tradeId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON public."Order" USING btree ("userId");

-- 2. Only the Activity Flex Query is used. make_flex_query_trades_nullable relaxed
--    this column; it was later dropped by hand.
ALTER TABLE public."BrokerConnection" DROP COLUMN IF EXISTS "flexQueryIdTrades";

-- 3. Prisma bootstrap leftover created by phase2_initial_schema, later dropped by hand.
DROP TABLE IF EXISTS public."_prisma_migrations";