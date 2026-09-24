# API route handlers

Every handler here follows the same contract. The pieces live in `lib/auth/`, `lib/billing/`
and `lib/audit/`; reuse them rather than re-rolling a check inline.

## Who may call a route

- **Default: authenticated user.** Open with `createClient()` from `lib/supabase/server` and
  `supabase.auth.getUser()`; 401 on miss. This is the RLS-scoped client — the one to use for
  everything done on the user's behalf (see `.claude/rules/multi-user.md`).
- **`/api/admin/*`** — `requireAdmin()` from `lib/auth/require-admin`, mapped to 401/403 by
  `adminAuthErrorResponse()`. See `app/(dashboard)/admin/AGENTS.md`.
- **`/api/cron/*`** — `verifyCronSecret()` bearer check. These are excluded from the proxy
  matcher, so the handler's check is the only gate.
- **`/api/billing/webhook`** — anonymous but HMAC-signed; the proxy lets it through unauthenticated.
- **`/api/cities`** — public open data, no auth.

`lib/auth/public-routes.ts` lists the anonymous routes, but nothing imports it — it documents,
it doesn't enforce. A new anonymous route still needs its own gate in the handler.

## Pro gates are enforced here, not in the UI

`getUserTier(user.id)` + `isProTier()`, then deny with `proRequiredResponse(feature)` — a 403
carrying `errorCode: 'pro_required'`, which is what the client keys its upgrade prompt on. The
Free manual-trade cap uses `tradeLimitReachedResponse` (`errorCode: 'trade_limit_reached'`).
A disabled button or a hidden toggle is presentation only; a crafted POST must still be refused.
`getUserTier` reads with the service-role client on purpose — billing columns are locked
against `authenticated`-role access.

## Rate limits

`checkRateLimit(key, limit, windowSeconds)` → `rateLimitedResponse(result, hebrewMessage)`
(429 + `Retry-After`). Key shape is `user:<id>:<action>`; give each tier its own bucket key so
an upgrade starts a fresh window. The limiter **fails open** by design — don't "harden" it into
blocking users when the RPC errors. Log rejections with `logAuditEvent({ eventType: 'rate_limit_hit' })`.

## Work that outlives the response

Use `waitUntil()` from `@vercel/functions` (see `ibkr/connect`, `admin/ibkr/[connectionId]/sync`
— the latter returns 202 and the UI polls). A bare unawaited promise or `setImmediate` gets killed when the response is sent.
Anything that can exceed Vercel's 60s cap belongs on the GitHub-Actions worker — see the
`cron-and-workers` skill.

## Responses

- Error strings the UI shows are Hebrew; malformed JSON is 400, schema failures are 422 with
  zod `flatten()` details.
- External URLs (redirects, callbacks) come from `getBaseUrl()` — `.claude/rules/base-url.md`.
- Position-changing routes under `trades/` have their own invariants —
  `.claude/rules/position-mutation-paths.md`.
