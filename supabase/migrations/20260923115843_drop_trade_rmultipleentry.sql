-- Dead column: only ever written as NULL by buildTradeInsert, never read.
-- Superseded by the generated "plannedR" column (add_planned_r_generated_column).
-- restore_trade_rmultipleentry_compat re-added it as a compat shim after the first
-- drop raced ahead of the code; main no longer references the name, so it can go.
ALTER TABLE public."Trade" DROP COLUMN IF EXISTS "rMultipleEntry";