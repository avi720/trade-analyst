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

- **Smart** (`gemini-3.5-flash-lite`, Free + Pro): 7 fields. `openedAt` is withheld so entry-time analysis stays Pro.
- **Full** (Pro, `gemini-3.8-flash`): adds `openedAt`, `executionQuality`, `emotionalState`.
- **Free text** (`notes`, `didRight`, `wouldChange`) is never inline in either mode — reachable
  only through the `queryTrades` tool, opt-in even in Full.

The gate lives in the tool **executors**, not just the declarations: a forbidden field requested
by the model is dropped and reported (`droppedFields` + a Hebrew note), never thrown. Adding a
column means deciding its mode first, then updating the projection, the tool field lists and
`system-prompt.ts` together — including its field-label glossary: the model sees code keys
(`planDeviation`, `actualR`) and is told to answer with the dashboard's label instead, so an
unlabeled key leaks into answers. The system-prompt test fails on any unlabeled KPI or row key.

## Inline vs tools vs web

- The in-scope set goes inline when it fits `CONTEXT_BUDGET_BYTES`; above that the turn runs the
  tool loop instead. The tool path is Pro-only — Free gets a 403 `context_too_large` asking to
  narrow the filter, not a silently truncated answer.
- Web grounding is offered only on Pro turns that register no tools. That began as a Gemini 2.5
  limit (search plus function declarations in one request was rejected). It is now a product
  gate: 3.x on the Interactions API accepts `google_search` alongside function tools, verified
  live on both models, stateless and stateful (2026-11-04). Lifting it is the owner's call, and
  it means changing `webSearch` in the route, passing the search tool to `callGeminiWithTools`,
  and rewriting the "one or the other" sections of `system-prompt.ts` together. The system
  prompt tells the model which one it has so it doesn't half-answer.
- Aggregation tools read `ctx.aggregates()` (`computeResearchAggregates`) so every number matches
  the research dashboard — don't re-derive metrics here; see `lib/utils/AGENTS.md`.

## Gemini calls are stateless Interactions

`gemini-client.ts` calls `genAI.interactions.create` with `store: false` and never uses
`previous_interaction_id`. Each turn resends `AIConversation.messages` as `user_input` /
`model_output` steps. Inside a tool-loop turn, the model's returned steps (thoughts, calls,
signatures) go back verbatim ahead of our `function_result`s. The DB stays the only copy of a
conversation, and the user's trade data isn't stored at Google. The reasoning, including a
measured cache comparison, is in
[docs/decisions/gemini-conversation-state.md](../../docs/decisions/gemini-conversation-state.md);
don't switch to server-side state without revisiting it. `system_instruction`, `tools` and
`generation_config` are per call in this API, never inherited.

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
