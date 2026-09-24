---
paths:
  - "app/auth/**"
  - "app/(auth)/**"
  - "app/api/auth/**"
  - "lib/audit/**"
  - "components/analytics/**"
  - "app/layout.tsx"
---

# Auth telemetry

Added after a Google-OAuth signup failed silently and left no trace in PostHog *or*
`AuditEvent` — [docs/in-progress/AUTH-HARDENING-GEO-GATE.md](../../docs/in-progress/AUTH-HARDENING-GEO-GATE.md).

- [components/analytics/analytics-identity.tsx](../../components/analytics/analytics-identity.tsx) is
  mounted in the **root** layout, not the dashboard layout — the blind spot is users who never
  reach the dashboard. Idempotent; no-ops without analytics consent.
- `/auth/callback` appends `reason=exchange_failed` on PKCE failure so `/signup/verified` can
  tell a genuine email verification from a failed exchange. The page renders the same copy
  either way, so **without the param the metric is meaningless**.
- `logAuditEvent` stamps `metadata.country` on **every** event type. `AuditContext.userId` is
  `string | null` — auth-callback events must pass `null`, because `AuditEvent.userId` has an FK
  to `User(id)` and those events fire before the `User` row exists.
- `signup_started` is deliberately **not** logged server-side: it happens in the browser, so
  capturing it would need a new unauthenticated POST endpoint — new attack surface for a metric
  PostHog already provides.
