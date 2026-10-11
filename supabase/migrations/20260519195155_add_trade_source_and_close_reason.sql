ALTER TABLE "Trade"
  ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'ibkr',
  ADD COLUMN IF NOT EXISTS "closeReason" text;

ALTER TABLE "Trade"
  ADD CONSTRAINT trade_source_check CHECK ("source" IN ('manual','ibkr'));

ALTER TABLE "Trade"
  ADD CONSTRAINT trade_close_reason_check CHECK ("closeReason" IS NULL OR "closeReason" IN ('original_stop','target','modified_stop','other'));