# Tests (Vitest)

## Integration suites hit a real database

`vitest.setup.ts` loads `.env.local`, so a plain `npm run test:run` also runs
`integration/*` against whichever Supabase project that file points at — currently the **dev**
project (`sssichkbdqariguvqprc`). Prod is `nwvswntqrqqtwzrhzpmi`; never point `.env.local` at
it to run these.

Each suite checks for `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and **skips
silently** without them. A green run on a machine without the key did not exercise them.

Each suite owns a fixed test-user UUID (`a0000000-0000-0000-0000-00000000000N`) so suites can
run in parallel, and cleans up its own rows. A new suite takes an unused id.

## Mocking conventions

Unit tests mock at module boundaries: `@/lib/supabase/server`, `@/lib/supabase/admin`,
`@/lib/audit/log`, `@google/genai`; `@/lib/auth/rate-limit` and `@/lib/billing/lemon-squeezy`
are partial mocks via `importOriginal`.

Mocking `logAuditEvent` hides FK failures — it swallows insert errors into a log line. That is
why `integration/audit-event-fk.test.ts` exists. If a route starts writing `AuditEvent` with a
new `userId` shape, cover the real insert there too.

`research-aggregate.test.ts` is a golden test — see `lib/utils/AGENTS.md`.
