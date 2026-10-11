---
name: db-schema
description: Migrations, schema changes, adding tables or columns, RLS policies, database RPCs, and regenerating lib/db/types.ts. Also the Trade/Order/User column inventory and which columns were deliberately dropped and must not come back. Load before any schema change.
---

# DB schema, migrations & generated types

Supabase Postgres: production `nwvswntqrqqtwzrhzpmi`, dev `sssichkbdqariguvqprc`. Accessed through the Supabase JS
client (`@supabase/ssr` server, `@supabase/supabase-js` browser/scripts), typed via the
generated `Database` type in [lib/db/types.ts](../../../lib/db/types.ts).

## Applying a schema change

Migrations are **files in git**, applied by the Supabase GitHub integration — not by the MCP
`apply_migration` tool, not by `execute_sql`, not by Prisma.

| Git branch | Supabase project | Applied when |
|---|---|---|
| `dev` | dev `sssichkbdqariguvqprc` | on every push to `dev` |
| `main` | production `nwvswntqrqqtwzrhzpmi` | on every push/merge to `main` |

Both integrations are set up in each project's **Settings → Integrations → GitHub**, working
directory `.`, "Deploy to production" on, "Automatic branching" off (dev and prod are separate
projects; Supabase Branching would only add billed preview databases).

The method:

1. Create `supabase/migrations/<yyyymmddHHMMSS>_<snake_name>.sql` with a **UTC** timestamp later
   than the newest file there (`npx supabase migration new <snake_name>` does this).
2. Commit and push to `dev`. The integration applies it to the dev project. Confirm with the MCP
   `list_migrations` on `sssichkbdqariguvqprc`, or the project's Branches → logs on failure.
3. Regenerate the types (below) and run `npm run build`.
4. Merging `dev` into `main` applies it to production. Same version in both projects by
   construction — the version is the filename.

**`apply_migration` is blocked** by a `PreToolUse` hook. A version applied straight to a
database exists there but not in `supabase/migrations/`, and the integration's next deploy
fails on "remote migration versions not found in local migrations directory".

**Never edit a migration that has already been pushed.** The integration only applies new
versions, so an edited file silently diverges from both databases. Fix forward with a new file.

Each migration should be idempotent-safe where practical (use `IF NOT EXISTS` / `IF EXISTS`
for objects that may already have been created out-of-band).

Never change the schema by hand in the dashboard or via `execute_sql`. Replaying
`supabase/migrations/` onto an empty project must reproduce production exactly; three hand-made
changes broke that and had to be codified after the fact in `codify_out_of_band_prod_drift`.

The 49 files up to `20261011065622_add_broker_connection_token_expiry_tracking.sql` were
exported byte-for-byte from production's `supabase_migrations.schema_migrations.statements`
(md5-verified) when the integration was set up on 2026-10-11. Both projects already had all of
them recorded, so connecting the integration applied nothing.

### Destructive changes wait for the code

A migration reaches production the moment `main` is pushed, while Vercel is still building —
the old code keeps serving for that window, and longer if the deploy fails. So a migration that
removes or narrows anything the code touches (`DROP COLUMN`, `DROP TABLE`, a rename, a new
`NOT NULL`, a tighter `CHECK`) ships in two releases:

1. **Code first.** Merge to `main` the code that no longer reads or writes the old shape.
   Additive migrations (a new nullable column, a new table, an index) may ride along with it.
2. **Then contract.** Only once that code is live in production, merge the destructive
   migration to `main` in a later release.

Before merging a destructive migration to `main`, confirm production code no longer uses the
name: `git grep -n "<name>" origin/main -- lib app components` must come back empty.

`add_planned_r_generated_column` broke this on 2026-09-14: it dropped `Trade.rMultipleEntry`
from production while `main` still wrote `rMultipleEntry: null` in `buildTradeInsert`
(`lib/ibkr/process-executions.ts`), so every new-position insert failed with
`Could not find the 'rMultipleEntry' column of 'Trade' in the schema cache`.

## Regenerating the typed Database client

After **any** schema change, regenerate the `Database` types:

1. Once the push to `dev` has applied the migration, call the Supabase MCP
   `generate_typescript_types` tool for the **dev** project id `sssichkbdqariguvqprc` —
   production doesn't have the change until `main` is merged, and the code on `dev` needs the
   new types first. Both projects replay the same files, so the output is identical.
2. Write the output to [lib/db/types.ts](../../../lib/db/types.ts), replacing the file.

Do **not** hand-edit `lib/db/types.ts` — it is fully generated and any manual change will be
overwritten on the next regeneration. `npm run build` is the backstop here: the TypeScript
gate fails on columns the generated types don't know about.

## RLS on new tables

Ship RLS enabled + an `auth.uid() = "userId"` policy in the **same migration** that creates
the table. See [`.claude/rules/multi-user.md`](../../rules/multi-user.md).

Admin-wide read access uses additive `admins_select_all_*` policies keyed off the
`SECURITY DEFINER public.is_admin(uuid)` helper. The helper exists because the naive
`EXISTS(SELECT ... FROM "User")` form causes infinite policy recursion.

## Table highlights

- `Trade` + `Order` — FIFO-based. Each execution = one `Order`. A `Trade` aggregates multiple `Order`s.
- `Order.brokerExecId` — UNIQUE. Global idempotency key for IBKR dedup.
- `Order.brokerOrderId` — NOT unique. Groups partial fills.
- `BrokerEvent` — raw XML audit log of every IBKR fetch. 90-day retention via the `pg_cron`
  job `purge-broker-events`.
- `BrokerConnection.flexTokenEncrypted` — AES-256-GCM. Never returned in API responses.
- `User.settings` (Json) — display preferences (currency, dateFormat, numberFormat, timezone)
  live under `settings.display`. There are **no** dedicated columns for these. API:
  `GET/PATCH /api/profile`.
- `User.isAdmin` (boolean) — gates the `/admin` surface.
- There is no `_prisma_migrations` table. `phase2_initial_schema` creates it (Prisma bootstrap
  leftover); `codify_out_of_band_prod_drift` drops it.

### Columns deliberately removed — do not re-add

`Order` columns dropped in the P8 cleanup of `docs/in-progress/PERFORMANCE-AUDIT.md`:
`tax`, `tradeDate`, `exchange`, `proceeds`, `brokerTradeId`, `rawPayload`. The audit trail
lives on `BrokerEvent.rawPayload` instead. If you find yourself wanting one of these back,
the data is already available elsewhere — check before migrating.

`Order.broker` was **reinstated** as an explicit column in P11. It had previously been stashed
inside the now-dropped `rawPayload` blob where no query could read it. Keep it a real column.

`Order` columns actually in use: `id`, `tradeId`, `userId`, `side`, `quantity`, `price`,
`commission`, `executedAt`, `brokerExecId`, `brokerOrderId`, `brokerClientAccountId`,
`currency`, `orderType`, `netCash`, `commissionCurrency`, `orderTime`, `broker`.

`User` columns: `id`, `email`, `name` (display name = firstName + lastName), `firstName`,
`lastName`, `phone`, `addressStreet`, `addressCity`, `addressCountry`, `isAdmin`,
`settings` (Json), `createdAt`, plus the billing columns (`subscriptionTier`,
`subscriptionStatus`, `subscriptionRenewsAt`, `lemonsqueezyCustomerId`,
`lemonsqueezySubscriptionId`).

Billing columns are RLS-protected against `authenticated`-role writes (migration
`harden_user_billing_write_paths`) — write them only through `createAdminClient()`.

## Database RPCs

- `reverse_position(...)` — atomic FIFO REVERSAL (close existing position + open opposite-side
  trade in one Postgres transaction). 11 params; see
  [`.claude/rules/reverse-position-rpc.md`](../../rules/reverse-position-rpc.md) for the
  signature and guard semantics.
- `claim_excel_import_job()` — atomic job claim for the AI-import worker
  (`FOR UPDATE SKIP LOCKED`).
- `is_admin(uuid)` — `SECURITY DEFINER` helper backing every `admins_select_all_*` policy.
- `admin_system_metrics()`, `admin_table_sizes()`, `admin_timeseries(days)` — read-only
  metrics for `/admin/health`. All `SECURITY DEFINER STABLE`, self-gating on
  `is_admin(auth.uid())` (raise `admin_only` otherwise), granted to **`service_role` only**
  (migration `revoke_admin_metrics_rpc_from_anon_authenticated`). `/admin/health` reaches them
  through `createAdminClient()`, so no other role needs `EXECUTE`. Note that Supabase's default
  privileges on `public` grant `EXECUTE` on every new function to `anon` **and**
  `authenticated` — a new admin-only RPC must revoke them explicitly, or advisors 0028/0029
  fire.
  `is_admin(uuid)` is the exception: `authenticated` must keep `EXECUTE`, because RLS policy
  expressions are evaluated with the querying role's privileges and every
  `admins_select_all_*` policy calls it.
