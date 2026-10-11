/**
 * Integration test: a user cannot choose the email on their own User row.
 * Skipped automatically if SUPABASE_SERVICE_ROLE_KEY is not set.
 *
 * The authenticated role holds column-level INSERT on "User".email and the
 * `users_own_row` policy only checks id, so before migration
 * `20261011170900_user_email_from_auth` a signed-up user could create their
 * row through PostgREST with any address — one the admin panel then showed as
 * theirs, or one belonging to someone who had not signed up yet, whose own
 * insert then failed on the unique `User_email_key`.
 *
 * The BEFORE INSERT trigger copies auth.users.email over whatever the client
 * sends. This signs in with a real JWT and checks both insert shapes the app
 * uses: the dashboard layout's insert+select and /api/profile's upsert. It also
 * checks that an id with no auth user gets the plain RLS error, so the trigger
 * cannot be used to probe which ids are registered.
 *
 * Runs against the real Supabase DB — cleans up after itself.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/db/types'

const DB_AVAILABLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000005'
const TEST_EMAIL = 'user-email-spoof-test@example.com'
const TEST_PASSWORD = 'user-email-spoof-test-pw-' + TEST_USER_ID
const SPOOFED_EMAIL = 'user-email-spoof-victim@example.com'
// Not a test-suite id and never created in auth.users.
const UNKNOWN_USER_ID = 'a0000000-0000-0000-0000-0000000000ff'

describe.skipIf(!DB_AVAILABLE)('User.email comes from auth.users, not the client', () => {
  const admin = DB_AVAILABLE ? createAdminClient() : null!

  async function cleanup() {
    await admin.from('User').delete().eq('id', TEST_USER_ID)
    await admin.auth.admin.deleteUser(TEST_USER_ID).catch(() => {})
  }

  async function signInAsTestUser() {
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { error } = await client.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    if (error) throw error
    return client
  }

  async function storedEmail() {
    const { data } = await admin.from('User').select('email').eq('id', TEST_USER_ID).single()
    return data?.email
  }

  beforeAll(async () => {
    await cleanup()
    const { error } = await admin.auth.admin.createUser({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin API accepts id, types lag
    } as any)
    if (error) throw error
  })

  afterAll(async () => {
    await cleanup()
  })

  it('layout-style insert with a spoofed email stores the auth email', async () => {
    const client = await signInAsTestUser()

    const { data, error } = await client
      .from('User')
      .insert({ id: TEST_USER_ID, email: SPOOFED_EMAIL, settings: {} })
      .select('email, subscriptionTier')
      .single()

    expect(error).toBeNull()
    expect(data?.email).toBe(TEST_EMAIL)
    expect(data?.subscriptionTier).toBe('Free')
    expect(await storedEmail()).toBe(TEST_EMAIL)

    const { count } = await admin
      .from('User')
      .select('id', { count: 'exact', head: true })
      .eq('email', SPOOFED_EMAIL)
    expect(count).toBe(0)
  })

  it('profile-style upsert (ignoreDuplicates) with a spoofed email stores the auth email', async () => {
    // Start without a row: on an existing one ON CONFLICT DO NOTHING never writes, so the
    // assertion would pass with or without the trigger.
    await admin.from('User').delete().eq('id', TEST_USER_ID)
    const client = await signInAsTestUser()

    const { error } = await client
      .from('User')
      .upsert({ id: TEST_USER_ID, email: SPOOFED_EMAIL }, { onConflict: 'id', ignoreDuplicates: true })

    expect(error).toBeNull()
    expect(await storedEmail()).toBe(TEST_EMAIL)
  })

  it('insert for an id with no auth user fails the same way as for any other user', async () => {
    const client = await signInAsTestUser()

    const { error } = await client
      .from('User')
      .insert({ id: UNKNOWN_USER_ID, email: SPOOFED_EMAIL, settings: {} })

    // The trigger runs before RLS; it must not raise its own error and reveal that the id
    // is not a registered user.
    expect(error?.code).toBe('42501')
  })
})
