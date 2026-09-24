# Claude Code doctor report — 2026-09-24

Handoff document for a follow-up session. Produced by `/doctor` (read-only scan) on
Claude Code 2.1.281, Windows 11 ARM64, native install.

**Status (2026-09-24, follow-up session):** Groups A, C, D, E applied. Group A verified —
`claude plugin list` shows the 8 synced plugins as `disabled`, so the local `enabledPlugins: false`
does override claude.ai sync. Group B handed to the user, who is switching the connectors off
from the desktop app's connector menu instead of `/mcp disable`. The originating session also set `permissions.defaultMode = "auto"` in
`~/.claude/settings.json` (user scope, all projects).

Scan window: the 50 most recent transcripts across 5 projects, 2026-06-09 → 2026-09-24.
Token figures are estimates (chars / 4), plugin figures from `claude plugin details <name>`.

## Summary

Install is healthy and current. The dominant cost is **8 barely-used plugins synced from claude.ai**,
~10.6k est. tokens resident every session, which also pushes the skill listing far past its ~1%
budget (so descriptions get truncated and skill routing degrades). Root `CLAUDE.md` can drop ~1k est.
tokens by cutting code-derivable content and moving area-specific sections into path-scoped rules.

## Inventory

| Component | Type | Scope | Uses (total) | Used in window? | Est. resident tok | Verdict |
|---|---|---|---|---|---|---|
| nimble@synced | plugin (16 skills + MCP) | claude.ai sync | 0 | no | ~4,976 | remove |
| searchfit-seo@synced | plugin (17 skills) | claude.ai sync | 1 | once (07-08) | ~1,550 | remove |
| data@synced | plugin (10 skills + MCP) | claude.ai sync | 5 | one burst (06-26/27) | ~1,128 | remove |
| marketing@synced | plugin | claude.ai sync | 1 | once (07-10) | ~874 | remove |
| product-management@synced | plugin | claude.ai sync | 0 | no | ~850 | remove |
| design@synced | plugin | claude.ai sync | 0 (2 skill uses in May) | no | ~619 | remove |
| productivity@synced | plugin | claude.ai sync | 0 | no | ~354 | remove |
| cowork-plugin-management@synced | plugin | claude.ai sync | 0 | no | ~259 | remove |
| engineering@synced | plugin | claude.ai sync | 15 | yes (09-14) | ~873 | keep |
| ui-ux-pro-max@ui-ux-pro-max-skill | plugin | user | 7 | yes (07-09) | ~403 | keep |
| execute-work-plan, work-plan | skill | user | 22, 10 | yes | ~490 | keep |
| db-schema, env-var, cron-and-workers | skill | project | 4, 1, 0 | yes/yes/no | ~170 | keep (mandated by CLAUDE.md) |
| anthropic-skills (11, synced) | skills | claude.ai | skill-creator 4 | yes | ~50 | not touching (Anthropic-provided) |
| Supabase, Google Drive, Gmail, Vercel | MCP connector | claude.ai | n/a | yes (116/30/6/5 calls) | deferred | keep |
| Context7 | MCP connector | claude.ai | n/a | no | deferred | keep (user reconnected it 09-24) |
| 21st, Base44, Canva, Claude Docs, Exa, Google Calendar, Higgsfield, HyperFrames, Nimble, PostHog, Sentry, Three.js 3D Viewer, Zoho CRM, Zoho Projects | MCP connectors | claude.ai | n/a | no (0 calls) | deferred* | disable in this project |
| `CLAUDE.md` (root) | memory | project | – | – | ~2,865 | trim + migrate |
| `app/(dashboard)/admin/CLAUDE.md` | memory (nested) | project | – | – | ~1,600 when loaded | trim |
| `~/.claude/CLAUDE.md` | memory | user (all projects) | – | – | ~360 | fix one stale line |

\*Deferred MCP tools cost ~0 up front, but Higgsfield, Nimble and Claude Docs inject long server
instructions every session (~1.4k est. tokens combined). Main rationale is still declutter.

## Proposed actions (not applied)

### Group A — synced plugins (saves ~10.6k est. tok/session)

Add to `~/.claude/settings.json` under `enabledPlugins` (keep the existing
`"ui-ux-pro-max@ui-ux-pro-max-skill": true`):

```json
"nimble@synced": false,
"searchfit-seo@synced": false,
"data@synced": false,
"marketing@synced": false,
"product-management@synced": false,
"design@synced": false,
"productivity@synced": false,
"cowork-plugin-management@synced": false
```

**Unverified:** these are claude.ai-synced plugins (`claude plugin list` shows them under
"Synced from claude.ai" with status `loaded`, not `enabled`). It is not confirmed that a local
`enabledPlugins: false` overrides them. After writing, run `claude plugin list` — if they still show
`loaded`, revert the edit and turn them off from claude.ai's plugin settings instead.
Write via a Node read-modify-write of that one key; don't dump the settings file.
Undo: delete the `false` entries.

### Group B — 14 unused claude.ai connectors (declutter; this project only)

Have the user run, in this project:

```
/mcp disable claude.ai 21st
/mcp disable claude.ai Base44
/mcp disable claude.ai Canva
/mcp disable claude.ai Claude Docs
/mcp disable claude.ai Exa
/mcp disable claude.ai Google Calendar
/mcp disable claude.ai Higgsfield
/mcp disable claude.ai HyperFrames by HeyGen
/mcp disable claude.ai Nimble
/mcp disable claude.ai PostHog
/mcp disable claude.ai Sentry
/mcp disable claude.ai Three.js 3D Viewer
/mcp disable claude.ai Zoho CRM
/mcp disable claude.ai Zoho Projects
```

(Or use the `/mcp` picker — exact configured names may differ slightly from the list above.)
This persists to `projects[<cwd>].disabledMcpServers` in `~/.claude.json`; prefer `/mcp` over
hand-editing that file while a session is running. Per-project — repeat elsewhere if wanted.
Undo: `/mcp enable <name>`. Never use `claude mcp remove` (wipes config + OAuth tokens).
Note: Sentry and PostHog are integrations this app uses, but neither connector was called in the
window — keep them if the user wants them handy for debugging.

### Group C — `~/.claude/CLAUDE.md` stale fact (loads in every project)

Replace:

> - `D:\` is the working drive; primary code lives under `D:\avipa\Documents\Programming\`.

with:

> - Primary code lives under `C:\Users\avipa\Documents\Programming\`.

There is no `D:` drive on this machine (`/d/` does not exist); this repo is at
`C:\Users\avipa\Documents\Programming\Trade Analyst`. No other dedup: the Hebrew/English line
overlaps `.claude/rules/rtl-and-language.md` but the global file serves other projects too.

### Group D — trim code-derivable content (checked-in; leave as uncommitted edits)

Root `CLAUDE.md`:

1. **Commands block (~11 lines, ~150 tok)** — standard `package.json` scripts. Remove the whole
   ```` ```bash ```` block under `## Commands`:
   ```
   npm run dev                                  # Dev server (http://localhost:3000)
   npm run build                                # Production build (TypeScript gate)
   npm run start                                # Start production server
   npm run lint                                 # ESLint 9 flat config (eslint.config.mjs)
   npm run test                                 # Vitest watch
   npm run test:run                             # Vitest once
   npm run test:run -- __tests__/fifo.test.ts   # Single file
   npm run test:run -- -t "REVERSAL"            # Tests matching name
   npm run db:seed                              # Seed DB (uses .env.local + service-role key)
   ```
   Replace with one line: `` `npm run build` is the TypeScript gate; `npm run db:seed` reads `.env.local` with the service-role key. ``

2. **`ManualLeg` field inventory (~9 lines, ~230 tok)** — a copy of the interface in
   `lib/trade/manual-entry.ts`, and **already stale** (missing `tags`; annotations are 7, not 6).
   Remove the three bullets starting `- **Required** (8)`, `- **Optional order-level** (6)`,
   `- **Optional Trade-level annotations** (6)`. Keep the sentence naming the three entry points
   (form, Excel import, AI import) that use it.

`app/(dashboard)/admin/CLAUDE.md` (~20 lines, ~450 tok when loaded):

3. Remove lines 84–98: the paragraph "The three `SECURITY DEFINER STABLE` functions …" and the three
   bullets describing what `admin_system_metrics()`, `admin_table_sizes()`, `admin_timeseries(days)`
   return (derivable from the migration SQL; the db-schema skill already describes them).
4. Remove lines 103–106: "The client dashboard renders card groups … All numbers use IBM Plex Mono."
5. **Keep** lines 100–101 (`staleSyncConnections` guards against the `SITE_URL` redirect bug).

`.claude/rules/*.md` — already lean, nothing to cut.

### Group E — migrate always-loaded sections to lazy loading (checked-in)

Root `CLAUDE.md`:

1. **"Position mutations — manual entry opens positions and nothing else" subsection (~17 lines).**
   `.claude/rules/position-mutation-paths.md` is a complete superset and its `paths:` already cover
   the routes, forms and modals. Replace the subsection body with:
   > Manual entry opens positions and nothing else; changing an existing position goes through the
   > add/reduce/close routes, and the Excel/AI import confirm routes are deliberately exempt. Full
   > invariant + exemptions: [`.claude/rules/position-mutation-paths.md`](.claude/rules/position-mutation-paths.md).

   Keep the invariant sentence in root — it is a "never" rule.

2. **"Auth telemetry" section (~20 lines)** → new `.claude/rules/auth-telemetry.md` with the section
   body verbatim and frontmatter:
   ```yaml
   ---
   paths:
     - "app/auth/**"
     - "app/(auth)/**"
     - "app/api/auth/**"
     - "lib/audit/**"
     - "components/analytics/**"
     - "app/layout.tsx"
   ---
   ```
   Root keeps one line: "Auth telemetry invariants (root-layout mount, `reason=exchange_failed`,
   `AuditContext.userId` null for auth-callback events): `.claude/rules/auth-telemetry.md`."
   Caveat: `logAuditEvent` is also called from billing/chat/admin routes; the `userId: null`
   rule only matters for pre-`User`-row events, which all live under the auth paths above.

3. **"AI custom-Excel import (Pro)" section (~12 lines)** → new `.claude/rules/ai-import.md`, drop the
   module-chain sentence (`sample-workbook → extract → …`, visible via `ls lib/trade/ai-import/`),
   keep the two constraints verbatim (timezone never AI-inferred; runs off-Vercel on the GH-Actions
   worker → `cron-and-workers` skill). Frontmatter:
   ```yaml
   ---
   paths:
     - "lib/trade/ai-import/**"
     - "app/api/trades/ai-import/**"
     - "app/api/cron/ai-import-*/**"
   ---
   ```
   Root keeps one line pointing at the rule.

4. Update the "Rules" paragraph at the top of root `CLAUDE.md` to list the two new rules.

Combined D + E: root `CLAUDE.md` ~11.5k → ~7.3k chars (~1k est. tok/session saved). No file is near
the ~40k-char large-memory warning threshold before or after.

## Applied in the originating session

| File | Change | Undo |
|---|---|---|
| `~/.claude/settings.json` | added `"permissions": {"defaultMode": "auto"}` | delete the `permissions` key (no other permission keys existed there) |

## Healthy / nothing to do

- **Install:** single native install at `~/.local/bin/claude.exe`, on PATH, matches
  `installMethod: native`; no npm-global or `~/.claude/local` leftovers.
- **Settings files:** `~/.claude/settings.json`, `~/.claude.json`, project `.claude/settings.json`
  and `.claude/settings.local.json` all parse. No `.mcp.json`.
- **Agents / skills:** no agent definitions; all 5 SKILL.md frontmatters parse as YAML.
- **Version:** 2.1.281 = latest on the `latest` channel. `autoUpdates: false` in `~/.claude.json`
  means background updates are off — current anyway; run `claude update` periodically.
- **Hooks:** `db-migration-notice.sh` pre/post — p50 ~0.7s, max 1.0s over 12 runs. Fine.
- **Denied commands:** nothing to pre-approve — denials were ≤2 each, all compound `cd … && …`
  commands (classifier-blocked or user-rejected), none vetted-read-only.

## Warnings

- Skill-listing budget (~1% of context) is heavily exceeded by the synced plugins' ~90 skills;
  Group A is the fix. Use `/context` for exact live numbers.
