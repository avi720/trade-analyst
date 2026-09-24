# Research metrics

Every number on the research dashboard, and every number חנן quotes about a group of trades,
comes from here.

## Two implementations that must agree

- `calculations.ts` + `research-charts.ts` — the **reference** helpers, one pass per metric.
- `research-aggregate.ts` — `computeResearchAggregates`, a **single walk** that materializes all
  of them at once. The dashboard and the chat aggregation tools both render from this one.

`__tests__/research-aggregate.test.ts` is a golden test proving the single walk equals calling
the reference helpers one by one. A new metric or chart goes into **both** files plus that test;
change a definition in one and the test fails until the other follows. `R_BINS` in particular
is duplicated and kept in lockstep.

## Definitions that look like bugs but aren't

- `rDistribution` bins are left-inclusive `[min, max)` — see `.claude/rules/fifo-invariants.md`.
- Plan-vs-reality deviation is measured on **winners only**; a stopped-out loser sits
  −(plannedR+1) below plan by construction.
- "Honored the stop" allows `STOP_DISCIPLINE_TOLERANCE_R` past −1R for commissions and slippage.
- `avgR` covers trades with a non-null `actualR` only; stopless trades are still classified
  win/loss by money.
- Day-of-week and hour charts bucket by **entry** time (`openedAt`) in the **runtime's local
  timezone** — the browser's on the dashboard.
- Tag stats are multi-membership: a trade counts toward every tag it carries, and there is no
  "untagged" bucket.

`position-calc.ts` (open-position metrics) is separate and has no aggregate twin.
