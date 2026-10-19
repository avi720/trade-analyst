/**
 * Integration test: IBRIT token lifecycle against the real DB — a rejected
 * token, a token renewed in place, and the expiry reminder claims.
 * Skipped automatically if SUPABASE_SERVICE_ROLE_KEY is not set.
 *
 * IBKR and the mailbox are mocked; the PostgREST filters (or/is-null/neq and
 * the conditional claim updates) are what this exercises. Cleans up after itself.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptToken } from '@/lib/ibkr/encrypt'
import { IBRIT_BROKER_NAME } from '@/lib/ibkr/broker-names'
import { IBRIT_TOKEN_INVALID_STATUS } from '@/lib/ibkr/ibrit-token'
import { IbritCredentialsError } from '@/lib/ibkr/ibrit-client'
import { syncIbritConnection } from '@/lib/ibkr/ibrit-sync'
import { sendIbritTokenExpiryReminders } from '@/lib/ibkr/ibrit-token-reminders'

const { fetchIbritRange, sendEmail } = vi.hoisted(() => ({ fetchIbritRange: vi.fn(), sendEmail: vi.fn() }))
vi.mock('@/lib/ibkr/ibrit-client', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ibkr/ibrit-client')>()),
  fetchIbritRange,
}))
vi.mock('@/lib/email/send', () => ({
  verifyEmailTransport: vi.fn().mockResolvedValue(undefined),
  sendEmail,
}))

const DB_AVAILABLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000004'
const TEST_EMAIL = 'ibrit-token-test@example.com'
const DAY = 86_400_000

// Each step is a few round trips to the DB; the default 5s is too tight from far away.
describe.skipIf(!DB_AVAILABLE)('IBRIT token lifecycle', { timeout: 30_000 }, () => {
  const admin = DB_AVAILABLE ? createAdminClient() : null!
  let connId: string
  // The sync matches writes on this exact ciphertext (random IV per encryption).
  let storedToken: string
  // Reminder runs see every IBRIT connection in the DB; their reminder state is put back after.
  let otherRows: { id: string; tokenExpiryReminderDays: number | null }[] = []

  async function cleanup() {
    await admin.from('BrokerEvent').delete().eq('userId', TEST_USER_ID)
    await admin.from('BrokerConnection').delete().eq('userId', TEST_USER_ID)
    await admin.from('User').delete().eq('id', TEST_USER_ID)
    await admin.auth.admin.deleteUser(TEST_USER_ID).catch(() => {})
  }

  async function connection() {
    const { data, error } = await admin
      .from('BrokerConnection')
      .select('lastSyncStatus, lastSyncError, tokenConnectedAt, tokenExpiryReminderDays')
      .eq('id', connId)
      .single()
    if (error) throw error
    return data
  }

  async function setConnection(fields: {
    tokenConnectedAt?: string
    tokenExpiryReminderDays?: number | null
    lastSyncStatus?: string | null
  }) {
    const { error } = await admin.from('BrokerConnection').update(fields).eq('id', connId)
    if (error) throw error
  }

  const connRow = () => ({
    id: connId,
    userId: TEST_USER_ID,
    brokerName: IBRIT_BROKER_NAME,
    flexTokenEncrypted: storedToken,
    flexQueryIdActivity: '123',
  })

  // Only this user's sends count here.
  const sendsToTestUser = () => sendEmail.mock.calls.filter(([m]) => m.to === TEST_EMAIL)

  beforeAll(async () => {
    await cleanup()
    const { error: authErr } = await admin.auth.admin.createUser({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      password: 'ibrit-token-test-pw-' + TEST_USER_ID,
      email_confirm: true,
    } as Parameters<typeof admin.auth.admin.createUser>[0] & { id: string })
    if (authErr) throw authErr
    const { error: userErr } = await admin
      .from('User')
      .insert({ id: TEST_USER_ID, email: TEST_EMAIL, firstName: 'Test', settings: {} })
    if (userErr) throw userErr
    const { data: others, error: othersErr } = await admin
      .from('BrokerConnection')
      .select('id, tokenExpiryReminderDays')
      .eq('brokerName', IBRIT_BROKER_NAME)
    if (othersErr) throw othersErr
    otherRows = others
    storedToken = encryptToken('test-token')
    const { data, error } = await admin
      .from('BrokerConnection')
      .insert({
        userId: TEST_USER_ID,
        brokerName: IBRIT_BROKER_NAME,
        flexTokenEncrypted: storedToken,
        flexQueryIdActivity: '123',
        isActive: true,
      })
      .select('id')
      .single()
    if (error) throw error
    connId = data.id
  }, 30_000)

  afterAll(async () => {
    for (const row of otherRows) {
      await admin
        .from('BrokerConnection')
        .update({ tokenExpiryReminderDays: row.tokenExpiryReminderDays })
        .eq('id', row.id)
    }
    await cleanup()
  }, 30_000)

  beforeEach(() => {
    fetchIbritRange.mockReset()
    sendEmail.mockReset()
  })

  it('a token IBKR rejects (1052) is marked TOKEN_INVALID, not a generic error', async () => {
    fetchIbritRange.mockRejectedValue(new IbritCredentialsError('IBRIT (1052): Token is invalid.'))
    const result = await syncIbritConnection(admin, connRow())
    expect(result.status).toBe('TOKEN_INVALID')
    const conn = await connection()
    expect(conn.lastSyncStatus).toBe(IBRIT_TOKEN_INVALID_STATUS)
    expect(conn.lastSyncError).toBe('IBRIT (1052): Token is invalid.')
  })

  it('a rejected token that works again restarts its year (renewed in the Portal)', async () => {
    const yearAgo = new Date(Date.now() - 366 * DAY).toISOString()
    await setConnection({
      tokenConnectedAt: yearAgo,
      tokenExpiryReminderDays: 1,
      lastSyncStatus: IBRIT_TOKEN_INVALID_STATUS,
    })
    fetchIbritRange.mockResolvedValue([])
    const before = Date.now()
    const result = await syncIbritConnection(admin, connRow())
    expect(result.status).toBe('SUCCESS')
    const conn = await connection()
    expect(new Date(conn.tokenConnectedAt!).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(conn.tokenExpiryReminderDays).toBeNull()
  })

  it('a working token past its year was renewed in place: its year restarts where the old one ended', async () => {
    const connectedAt = new Date('2025-10-01T08:00:00.000Z')
    await setConnection({
      tokenConnectedAt: connectedAt.toISOString(),
      tokenExpiryReminderDays: 1,
      lastSyncStatus: 'SUCCESS',
    })
    fetchIbritRange.mockResolvedValue([])
    await syncIbritConnection(admin, connRow())
    const conn = await connection()
    expect(new Date(conn.tokenConnectedAt!).toISOString()).toBe('2026-10-01T08:00:00.000Z')
    expect(conn.tokenExpiryReminderDays).toBeNull()
  })

  it('a rejection from a sync started before the user pasted a new token is not recorded', async () => {
    await setConnection({ lastSyncStatus: 'SUCCESS' })
    fetchIbritRange.mockRejectedValue(new IbritCredentialsError('IBRIT (1052): Token is invalid.'))
    // The in-flight sync still holds the previous token's ciphertext.
    await syncIbritConnection(admin, { ...connRow(), flexTokenEncrypted: encryptToken('previous-token') })
    expect((await connection()).lastSyncStatus).toBe('SUCCESS')
  })

  it('a working token keeps its connection date', async () => {
    const connectedAt = new Date(Date.now() - 100 * DAY).toISOString()
    await setConnection({ tokenConnectedAt: connectedAt, tokenExpiryReminderDays: null, lastSyncStatus: 'SUCCESS' })
    fetchIbritRange.mockResolvedValue([])
    await syncIbritConnection(admin, connRow())
    expect(new Date((await connection()).tokenConnectedAt!).toISOString()).toBe(connectedAt)
  })

  it('emails the 7-day reminder once, then the 1-day reminder once', async () => {
    // Expires in ~5 days.
    await setConnection({
      tokenConnectedAt: new Date(Date.now() - 360 * DAY).toISOString(),
      tokenExpiryReminderDays: null,
      lastSyncStatus: 'SUCCESS',
    })
    sendEmail.mockResolvedValue(undefined)

    await sendIbritTokenExpiryReminders(admin)
    expect(sendsToTestUser()).toHaveLength(1)
    expect(sendsToTestUser()[0][0].subject).toContain('בעוד שבוע')
    expect((await connection()).tokenExpiryReminderDays).toBe(7)

    await sendIbritTokenExpiryReminders(admin)
    expect(sendsToTestUser()).toHaveLength(1)

    // Expires in ~12 hours.
    const now = new Date()
    const expiresSoon = new Date(now.getTime() + DAY / 2)
    expiresSoon.setUTCFullYear(expiresSoon.getUTCFullYear() - 1)
    await setConnection({ tokenConnectedAt: expiresSoon.toISOString() })
    await sendIbritTokenExpiryReminders(admin, now)
    expect(sendsToTestUser()).toHaveLength(2)
    expect(sendsToTestUser()[1][0].subject).toContain('תוך יום')
    expect((await connection()).tokenExpiryReminderDays).toBe(1)
  })

  it('skips a token IBKR already rejected', async () => {
    await setConnection({
      tokenConnectedAt: new Date(Date.now() - 360 * DAY).toISOString(),
      tokenExpiryReminderDays: null,
      lastSyncStatus: IBRIT_TOKEN_INVALID_STATUS,
    })
    await sendIbritTokenExpiryReminders(admin)
    expect(sendsToTestUser()).toHaveLength(0)
    expect((await connection()).tokenExpiryReminderDays).toBeNull()
  })

  it('a failed send releases the claim so the next run retries', async () => {
    await setConnection({
      tokenConnectedAt: new Date(Date.now() - 360 * DAY).toISOString(),
      tokenExpiryReminderDays: null,
      lastSyncStatus: 'SUCCESS',
    })
    sendEmail.mockImplementation(async (m: { to: string }) => {
      if (m.to === TEST_EMAIL) throw new Error('SMTP down')
    })
    const result = await sendIbritTokenExpiryReminders(admin)
    expect(result.failed).toBeGreaterThanOrEqual(1)
    expect((await connection()).tokenExpiryReminderDays).toBeNull()
  })
})
