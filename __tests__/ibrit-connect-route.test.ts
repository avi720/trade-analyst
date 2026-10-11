/**
 * Route-level tests for POST /api/ibkr/ibrit/connect — which connection date
 * the saved token gets. The token's 1-year validity and its expiry reminders
 * count from BrokerConnection.tokenConnectedAt, so re-saving the same working
 * token must keep it, and any other save must restart it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({})) }))
vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }))
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }))
vi.mock('@/lib/ibkr/sync-pipeline', () => ({ syncOneConnection: vi.fn(async () => undefined) }))
vi.mock('@/lib/billing/tier', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/billing/tier')>()),
  getUserTier: vi.fn(async () => ({ tier: 'Pro', status: 'active', renewsAt: null })),
}))
vi.mock('@/lib/auth/rate-limit', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/rate-limit')>()),
  checkRateLimit: vi.fn(async () => ({ ok: true, remaining: 4, resetAt: new Date(Date.now() + 3600_000) })),
}))
vi.mock('@/lib/ibkr/ibrit-client', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ibkr/ibrit-client')>()),
  fetchIbritRange: vi.fn(async () => []),
}))

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchIbritRange, IbritCredentialsError } from '@/lib/ibkr/ibrit-client'
import { encryptToken } from '@/lib/ibkr/encrypt'
import { POST } from '@/app/api/ibkr/ibrit/connect/route'

const CONNECTED_AT = '2026-03-01T10:00:00.000+00:00'

interface ExistingRow {
  brokerName: string
  flexTokenEncrypted: string
  lastSyncStatus: string | null
  tokenConnectedAt: string | null
  tokenExpiryReminderDays: number | null
}

function mockSupabase(existing: ExistingRow | null) {
  const upsert = vi.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      single: async () => ({ data: { id: 'conn-1', userId: 'u-1', ...payload }, error: null }),
    }),
  }))
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'u-1' } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }),
      upsert,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return upsert
}

function connect(token = 'tok-1') {
  return POST(
    new NextRequest('http://localhost/api/ibkr/ibrit/connect', {
      method: 'POST',
      body: JSON.stringify({ token, queryId: '123' }),
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

const ibritRow = (token: string, lastSyncStatus: string | null = 'SUCCESS'): ExistingRow => ({
  brokerName: 'IBKR_IBRIT',
  flexTokenEncrypted: encryptToken(token),
  lastSyncStatus,
  tokenConnectedAt: CONNECTED_AT,
  tokenExpiryReminderDays: 7,
})

describe('POST /api/ibkr/ibrit/connect — token connection date', () => {
  beforeEach(() => {
    vi.stubEnv('FLEX_TOKEN_ENCRYPTION_KEY', 'a'.repeat(64))
    vi.mocked(fetchIbritRange).mockReset().mockResolvedValue([])
  })

  function expectFreshDate(payload: Record<string, unknown>, before: number) {
    expect(new Date(payload.tokenConnectedAt as string).getTime()).toBeGreaterThanOrEqual(before)
    expect(payload.tokenExpiryReminderDays).toBeNull()
  }

  it('a first connection starts the date now', async () => {
    const upsert = mockSupabase(null)
    const before = Date.now()
    expect((await connect()).status).toBe(200)
    expectFreshDate(upsert.mock.calls[0][0], before)
  })

  it('re-saving the same working token keeps its date and reminder state', async () => {
    const upsert = mockSupabase(ibritRow('tok-1'))
    expect((await connect('tok-1')).status).toBe(200)
    expect(upsert.mock.calls[0][0]).toMatchObject({ tokenConnectedAt: CONNECTED_AT, tokenExpiryReminderDays: 7 })
  })

  it('a different token restarts the date', async () => {
    const upsert = mockSupabase(ibritRow('tok-old'))
    const before = Date.now()
    await connect('tok-new')
    expectFreshDate(upsert.mock.calls[0][0], before)
  })

  it('the same token after IBKR rejected it restarts the date (renewed in the Portal)', async () => {
    const upsert = mockSupabase(ibritRow('tok-1', 'TOKEN_INVALID'))
    const before = Date.now()
    await connect('tok-1')
    expectFreshDate(upsert.mock.calls[0][0], before)
  })

  it('replacing a Flex connection starts the date now', async () => {
    const upsert = mockSupabase({ ...ibritRow('tok-1'), brokerName: 'IBKR_FLEX', tokenConnectedAt: null })
    const before = Date.now()
    await connect('tok-1')
    expectFreshDate(upsert.mock.calls[0][0], before)
  })

  it('a token IBKR rejects is refused with 422 and not saved', async () => {
    const upsert = mockSupabase(null)
    vi.mocked(fetchIbritRange).mockRejectedValue(new IbritCredentialsError('IBRIT (1052): invalid'))
    expect((await connect()).status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })
})
