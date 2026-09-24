# Chat assistant (חנן)

Entry point is `POST /api/chat` (`app/api/chat/route.ts`); this directory is everything it
assembles. Server-only, except `chat-context.tsx`.

## The server owns the data

The client never ships trade rows. It sends only *which* trades are in scope (`tradeIds`, when
the research filter narrows the set); the route re-selects them with `CHAT_TRADE_COLUMNS`
(`context-builder.ts`). Keep it that way — the old design sent 400–600 KB of client-built JSON
per turn.

## Tier gates are field gates

What each mode may see is a product boundary, enforced in code:

- **Smart** (Flash, Free + Pro): 7 fields. `openedAt` is withheld so entry-time analysis stays Pro.
- **Full** (Pro, `gemini-2.5-pro`): adds `openedAt`, `executionQuality`, `emotionalState`.
- **Free text** (`notes`, `didRight`, `wouldChange`) is never inline in either mode — reachable
  only through the `queryTrades` tool, opt-in even in Full.

The gate lives in the tool **executors**, not just the declarations: a forbidden field requested
by the model is dropped and reported (`droppedFields` + a Hebrew note), never thrown. Adding a
column means deciding its mode first, then updating the projection, the tool field lists and
`system-prompt.ts` together.

## Inline vs tools vs web

- The in-scope set goes inline when it fits `CONTEXT_BUDGET_BYTES`; above that the turn runs the
  tool loop instead. The tool path is Pro-only — Free gets a 403 `context_too_large` asking to
  narrow the filter, not a silently truncated answer.
- Gemini 2.5 rejects `googleSearch` together with `functionDeclarations`, so web grounding is
  offered only on Pro turns that register no tools. The system prompt tells the model which one
  it has so it doesn't half-answer.
- Aggregation tools read `ctx.aggregates()` (`computeResearchAggregates`) so every number matches
  the research dashboard — don't re-derive metrics here; see `lib/utils/AGENTS.md`.

## Timestamps are in the user's timezone

The route runs in UTC; the user reads the dashboard in their browser's zone. The sidebar sends
that IANA zone with each turn and the route validates it (`normalizeTimeZone`, fallback `'UTC'`).
Everything the model reads uses it: inline rows and `queryTrades` rows render timestamps with
`toZonedIso` (`2026-01-04T01:30:00+02:00`), date-only / offset-less filter bounds are local, the
aggregates bucket day/hour in it, and the system prompt names it. Never emit `toISOString()` to
the model — it would read UTC hours as the user's.

## Limits and observability

Chat caps come from `lib/billing/limits.ts` (hourly for both tiers, daily per tier). Each turn
logs one `[chat] turn` line with token usage; `cacheHitRatio` is how the decision to rely on
Gemini's implicit prompt caching gets verified — keep that log line.
