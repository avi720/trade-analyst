-- TEMPORARY compatibility column, restored 2026-09-14 to stop an outage.
--
-- Why: add_planned_r_generated_column (20260914044139) dropped Trade."rMultipleEntry"
-- from production while main still wrote `rMultipleEntry: null` in buildTradeInsert
-- (lib/ibkr/process-executions.ts), so every new-position insert — IBKR sync, manual
-- entry, Excel and AI import — failed with "Could not find the 'rMultipleEntry' column
-- of 'Trade' in the schema cache". Re-adding it as a nullable, unused column makes the
-- code deployed today work again without shipping code under time pressure. No data is
-- lost: the column only ever held NULL.
--
-- When to drop it: per environment, once the code that no longer writes it (the plannedR
-- commit, "feat(research): plan deviation + stop discipline KPIs on a DB-generated
-- plannedR") is deployed to that same environment:
--   * dev  (sssichkbdqariguvqprc): once that commit is live on the dev branch / preview;
--   * prod (nwvswntqrqqtwzrhzpmi): once that commit is live on main.
-- Check before dropping: git grep -n "rMultipleEntry" origin/<branch> -- lib app components
-- must come back empty. If dev drops first, run the DROP there with execute_sql and do not
-- record a version; when the prod drop migration is applied, record production's version in
-- dev. See "Destructive changes wait for the code" in .claude/skills/db-schema/SKILL.md.
ALTER TABLE public."Trade" ADD COLUMN IF NOT EXISTS "rMultipleEntry" numeric;

COMMENT ON COLUMN public."Trade"."rMultipleEntry" IS
  'TEMPORARY (2026-09-14): unused compat column, restored because add_planned_r_generated_column dropped it while main still wrote it. Drop it per environment once the plannedR code is deployed to that environment (dev: the dev branch/preview; prod: main). See migration restore_trade_rmultipleentry_compat.';