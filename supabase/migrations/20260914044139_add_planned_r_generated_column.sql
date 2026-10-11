-- rMultipleEntry: dead column, only ever written as NULL (lib/ibkr/process-executions.ts).
-- Replaced by plannedR, a generated column that can never go stale: scale-ins move
-- avgEntryPrice and the trade-detail modal back-fills stop/target on closed trades.
ALTER TABLE public."Trade" DROP COLUMN IF EXISTS "rMultipleEntry";

ALTER TABLE public."Trade" ADD COLUMN IF NOT EXISTS "plannedR" numeric
  GENERATED ALWAYS AS (
    CASE
      WHEN "stopPrice" IS NULL OR "targetPrice" IS NULL THEN NULL
      WHEN direction = 'Long'  AND ("avgEntryPrice" - "stopPrice") >= 0.0001 AND "targetPrice" > "avgEntryPrice"
        THEN ("targetPrice" - "avgEntryPrice") / ("avgEntryPrice" - "stopPrice")
      WHEN direction = 'Short' AND ("stopPrice" - "avgEntryPrice") >= 0.0001 AND "targetPrice" < "avgEntryPrice"
        THEN ("avgEntryPrice" - "targetPrice") / ("stopPrice" - "avgEntryPrice")
      ELSE NULL
    END
  ) STORED;

COMMENT ON COLUMN public."Trade"."plannedR" IS
  'Planned reward/risk at entry, direction-aware. Generated from avgEntryPrice/stopPrice/targetPrice; NULL when the plan is incomplete or inverted. Risk floor 0.0001 mirrors MIN_RISK_PER_SHARE in lib/trade/fifo.ts.';