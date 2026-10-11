-- 1. Drop the old CHECK so the data update + new default don't violate it
ALTER TABLE "Trade" DROP CONSTRAINT IF EXISTS trade_source_check;

-- 2. Migrate existing data
UPDATE "Trade" SET "source" = 'broker' WHERE "source" = 'ibkr';

-- 3. New default
ALTER TABLE "Trade" ALTER COLUMN "source" SET DEFAULT 'broker';

-- 4. New CHECK: only 'manual' or 'broker'
ALTER TABLE "Trade"
  ADD CONSTRAINT trade_source_check CHECK ("source" IN ('manual','broker'));