/**
 * Integration test: requests without a session cannot touch any app table.
 * Skipped automatically if the Supabase URL or anon key is not set.
 *
 * Supabase's default privileges gave the anon role every privilege, DELETE and
 * TRUNCATE included, on each table in public. RLS returned zero rows, but it
 * was the only barrier: one over-broad policy would have exposed every user's
 * data to anyone holding the public anon key. Migration
 * `20261019092640_revoke_anon_table_grants` revokes them, so an anon query now
 * fails on privileges (42501) before RLS is consulted, not with an empty result.
 *
 * Writes nothing: a SELECT and a DELETE per table, both of which must fail on
 * privileges; the DELETE also filters on an id no row has. Needs no test user.
 */

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/types'

const DB_AVAILABLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TABLES = [
  'AIConversation',
  'AuditEvent',
  'BillingWebhookEvent',
  'BrokerConnection',
  'BrokerEvent',
  'ExcelImportJob',
  'Order',
  'RateLimit',
  'Trade',
  'User',
] as const satisfies readonly (keyof Database['public']['Tables'])[]

// Fails the build when a table is added to the generated types but not to TABLES.
type UncoveredTables = Exclude<keyof Database['public']['Tables'], (typeof TABLES)[number]>
const allTablesCovered: [UncoveredTables] extends [never] ? true : UncoveredTables = true
void allTablesCovered

// The DELETE needs a filter on a real column: an unknown one fails with 42703
// before the privilege check. RateLimit is keyed by `key`, the rest by `id`.
const KEY_COLUMN: Partial<Record<(typeof TABLES)[number], string>> = { RateLimit: 'key' }

// Fixed, never-created value, so a DELETE that slipped past the privilege check
// would still match nothing.
const NO_SUCH_ID = 'a0000000-0000-0000-0000-0000000000fe'

describe.skipIf(!DB_AVAILABLE)('anon role has no table privileges', () => {
  const anon = DB_AVAILABLE
    ? createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null!

  it.each(TABLES)('SELECT on %s is denied', async (table) => {
    const { data, error } = await anon.from(table).select('*').limit(1)
    expect(data).toBeNull()
    expect(error?.code).toBe('42501')
  })

  it.each(TABLES)('DELETE on %s is denied', async (table) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the key column differs per table
    const { error } = await (anon.from(table) as any).delete().eq(KEY_COLUMN[table] ?? 'id', NO_SUCH_ID)
    expect(error?.code).toBe('42501')
  })
})
