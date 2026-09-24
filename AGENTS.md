# AGENTS.md

Guidance for coding agents working in this repository. Claude Code reads it through the
one-line `CLAUDE.md` next to it (`@AGENTS.md`); every nested `AGENTS.md` has the same
companion — add one whenever you add a nested `AGENTS.md`. This file is the always-loaded
layer: commands, architecture orientation, and cross-cutting gotchas. Detail that only matters
for part of the work lives in the on-demand layers below — keep it that way. If something here
reads like a "must / must not" scoped to one area, it belongs in a rule; if it's reference
detail, it belongs in a skill.

## Where the rest of the knowledge lives

**Rules** — [`.claude/rules/`](.claude/rules/). Most carry `paths:` frontmatter and load only
when the matching files are touched (FIFO invariants + concurrency, position-mutation paths,
`reverse_position` RPC, IBKR date parsing, multi-user/RLS, base URL, client env vars, AI
import, auth telemetry).
`rtl-and-language.md` is unscoped and always loads.

**Skills** — load one of these *before* starting the matching work, not after:

| Doing this | YOU MUST first load |
|---|---|
| Any schema change, migration, RLS policy, new column, regenerating `lib/db/types.ts` | `db-schema` |
| Adding, renaming or removing an environment variable | `env-var` |
| Touching `.github/workflows`, `/api/cron/*`, the AI-import worker, backfill, retention | `cron-and-workers` |

Two things from those skills are worth knowing without loading anything: **`Order` columns
dropped in cleanup (`tax`, `tradeDate`, `exchange`, `proceeds`, `brokerTradeId`, `rawPayload`)
must not be re-added** — the audit trail lives on `BrokerEvent.rawPayload`; and **`SITE_URL`
must be the non-redirecting origin**, or every cron silently no-ops while Actions stays green.

The `db-schema` row is additionally enforced, not just requested: a `PreToolUse` /
`PostToolUse` hook pair in [.claude/settings.json](.claude/settings.json) fires on any MCP
`apply_migration` call and injects the checklist plus the regenerate-types reminder
([.claude/hooks/db-migration-notice.sh](.claude/hooks/db-migration-notice.sh)). It emits JSON
via `node`, not `jq` — `jq` is not installed on this machine.

**Nested AGENTS.md** — load on their own when files in that directory are read. Only
directories with knowledge the code doesn't make obvious get one:

| Directory | Covers |
|---|---|
| [app/api/](app/api/AGENTS.md) | The route-handler contract: auth, Pro gates, rate limits, background work |
| [app/(dashboard)/admin/](app/(dashboard)/admin/AGENTS.md) | Admin panel: gating, admin RLS, what each sub-page may and may not do |
| [lib/chat/](lib/chat/AGENTS.md) | חנן: server-owned context, per-tier field gates, tools vs web search |
| [lib/billing/](lib/billing/AGENTS.md) | Which subscription states grant Pro, single sources for prices and limits |
| [lib/utils/](lib/utils/AGENTS.md) | Research metrics: the single-walk aggregator must match the reference helpers |
| [\_\_tests\_\_/](__tests__/AGENTS.md) | Integration suites hit a real Supabase project; mocking conventions |

**Decisions** — [docs/decisions/](docs/decisions/) records things that are deliberately not
built or deliberately off, so they don't get "fixed":
[geo-gate.md](docs/decisions/geo-gate.md) (built, off on purpose — do not enable, and do not
remove the `/api/cron/*` exclusion from the proxy matcher) and
[captcha-dropped.md](docs/decisions/captcha-dropped.md).

## Commands

`npm run build` is the TypeScript gate; `npm run db:seed` reads `.env.local` with the service-role key.

## Architecture

**Trade Analysis** is a Hebrew RTL trading journal with AI assistant ("חנן"), built on
Next.js 16 App Router + React 19 + Supabase. Public multi-user SaaS — public signup via
`/signup`, RLS at the DB level. See [`.claude/rules/multi-user.md`](.claude/rules/multi-user.md).

```
Supabase Auth → proxy.ts → protected routes → DashboardLayout
                                              (server, checks session, upserts User row)
                                              → Header + tab content
```

Two layout facts that break silently if you get them wrong:

- The edge gate is [proxy.ts](proxy.ts) — Next 16 renamed `middleware.ts` → `proxy.ts` and the
  export from `middleware` → `proxy`. **There is no `middleware.ts` in this repo; don't add one.**
- `<ChatSidebar />` sits **outside** the `overflow-hidden` flex div in
  `app/(dashboard)/layout.tsx`, as a sibling — required so `position: fixed` anchors to the
  viewport instead of rendering inline. `ChatContextProvider` wraps everything.

### Key facts

- **Routing**: default landing is `/research`. `app/page.tsx`, the login page and the auth
  callback all redirect there. The old live open-positions `/dashboard` view was removed
  entirely (tech-debt T14); a real-time view would be rebuilt from scratch.
- **Nav tabs**: "תחקור" (`/research`) · "חיפוש" (`/search`) · "ייבוא-ידני" (`/manual-import`).
- **Profile/Settings**: unified at `/profile` with sidebar tabs — חשבון / אבטחה / תצוגה / ברוקר.
  `/settings` redirects to `/profile?tab=broker`.
- **IBKR**: Flex Web Service, 2-step pull (request → download). Token valid ~1 year, encrypted
  AES-256-GCM at rest. Only the **Activity** Flex Query is used.
- **Massive (formerly Polygon)**: `lib/massive`, `app/api/massive`, `MASSIVE_API_KEY`.
  **Price sync is currently disabled** — no workflow, sync dot removed from
  `components/sync-indicator.tsx`, settings panel hidden. Code paths still exist for re-enabling.

### Theme

Dark only; no light theme and none planned. The palette lives in
[app/globals.css](app/globals.css) under `:root` — **that file is the source of truth for hex
values, don't duplicate them here.** What the CSS can't express:

- `--green` / `--red` mean **gain / loss**, never generic success/error chrome.
- `--amber` is the single accent: primary action, focus ring, active tab.
- Everything else is grayscale on near-black; depth comes from the `--panel-bg` on `--bg-dark`
  pair plus a `--border` hairline.

Fonts: **IBM Plex Mono** (numbers, tickers, timestamps) + **Assistant** (UI, Hebrew).

## FIFO logic

`matchExecution` in [lib/trade/fifo.ts](lib/trade/fifo.ts) is a pure function returning a
`FifoAction` union (`OPEN | SCALE_IN | REDUCE | CLOSE | REVERSAL`). Persistence + concurrency
handling live in [lib/ibkr/process-executions.ts](lib/ibkr/process-executions.ts). Invariants
and concurrency rules: [`.claude/rules/fifo-invariants.md`](.claude/rules/fifo-invariants.md),
[`.claude/rules/fifo-concurrency.md`](.claude/rules/fifo-concurrency.md).

IBKR Flex emits `dd/MM/yyyy;HH:mm:ss TimeZone`, parsed manually in
[lib/ibkr/parse-date.ts](lib/ibkr/parse-date.ts) — see
[`.claude/rules/ibkr-date-parsing.md`](.claude/rules/ibkr-date-parsing.md) for why `new Date()`
and `date-fns parse()` don't work, plus the Flex dual-root quirk.

## Manual entry pipeline

`ManualLeg` ([lib/trade/manual-entry.ts](lib/trade/manual-entry.ts)) is the input type for the
form (`/manual-import`), the Excel import and the AI import.

`persistManualLegs(legs, userId)` in
[lib/trade/persist-manual-legs.ts](lib/trade/persist-manual-legs.ts) is the shared persistence
half (FIFO → annotation merge → manual-source tag → `recomputeActualR`), reused by the manual,
Excel-confirm and AI-confirm routes. `manualBrokerExecId(leg, i)` is the single source of the
dedup key, and annotation mapping must reconstruct it **timezone-aware** — a leg's non-UTC tz
shifts the instant, so the key has to apply `localToUtcIso`.

### Position mutations — manual entry opens positions and nothing else

Manual entry opens positions and nothing else; changing an existing position goes through the
add/reduce/close routes, and the Excel/AI import confirm routes are deliberately exempt. Full
invariant + exemptions: [`.claude/rules/position-mutation-paths.md`](.claude/rules/position-mutation-paths.md).

### AI custom-Excel import (Pro)

Pro users upload an arbitrary-layout xlsx; Gemini maps or extracts it into `ManualLeg[]`, the
user reviews an editable preview, and confirm flows through `persistManualLegs`. Constraints
(timezone never AI-inferred, off-Vercel worker): [`.claude/rules/ai-import.md`](.claude/rules/ai-import.md).

## Auth telemetry

Auth telemetry invariants (root-layout mount, `reason=exchange_failed`, `AuditContext.userId`
null for auth-callback events): [`.claude/rules/auth-telemetry.md`](.claude/rules/auth-telemetry.md).

## Phase history

Shipped in eight phases plus post-Phase-8 refactors and several tech-debt rounds. The
invariants that survived are in the sections above; the phase logs were never persisted as
files. Read them out of git history when needed (`git log --grep='Phase'`, or scope to
`lib/trade/`, `lib/ibkr/`, `lib/chat/`).

## QA / testing

[docs/qa-test-user.md](docs/qa-test-user.md) tracks the dedicated QA test user, its current
dataset + expected research KPIs (regression baseline), bugs found during QA, operational
gotchas and ready-to-run reset/verification SQL. **Read it before running further experiments
on that user.**
