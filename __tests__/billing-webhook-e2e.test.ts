/**
 * End-to-end webhook flow against an in-memory Supabase.
 *
 * `POST` is the real route handler: real HMAC check, real `grantsPro`, real
 * `logAuditEvent`. The service-role client is the only fake, and it actually
 * stores User rows, the BillingWebhookEvent ledger (UNIQUE event_id), and
 * AuditEvent (userId FK). Nothing here calls Lemon Squeezy or a Supabase project.
 *
 * The shallow cases in billing-webhook.test.ts script each query result. This
 * file delivers a sequence and asserts the User row that sequence leaves behind,
 * so a missing ordering filter or a ledger row that survives a failed write
 * fails the assertion instead of a mocked return value.
 */

import { createHash } from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLemonSqueezyConfig } from '@/lib/billing/lemon-squeezy'
import { POST } from '@/app/api/billing/webhook/route'
import { createMemoryAdmin, type MemoryAdmin, type MemoryUser } from './helpers/memory-admin'
import {
  BYSTANDER_USER_ID,
  TEST_WEBHOOK_SECRET,
  WEBHOOK_USER_ID,
  createdSubscription,
  failedInvoice,
  normalizedUpdatedAt,
  paidInvoice,
  pausedSubscription,
  signBody,
  webhookRequest,
  type LsWebhook,
} from './helpers/ls-webhook-fixtures'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/billing/lemon-squeezy', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/billing/lemon-squeezy')>()
  return {
    ...original,
    getLemonSqueezyConfig: vi.fn(),
  }
})

const DAY = 24 * 60 * 60 * 1000
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString()

const T0 = '2026-10-20T10:00:00.000000Z'
const T1 = '2026-10-20T10:05:00.000000Z'
const T2 = '2026-11-20T10:00:05.000000Z'
const T3 = '2026-11-20T11:00:00.000000Z'
const T4 = '2026-11-21T08:00:00.000000Z'
const T4B = '2026-11-21T09:00:00.000000Z'
const T5 = '2026-12-20T10:00:01.000000Z'

function makeConfig() {
  return {
    apiKey: 'test-key',
    storeId: '18432',
    variantIdMonthly: '158203',
    variantIdAnnual: '158204',
    webhookSecret: TEST_WEBHOOK_SECRET,
    discountCodeLaunchMonthly: null,
    discountCodeLaunchAnnual: null,
  }
}

let db: MemoryAdmin

async function post(body: LsWebhook | string, signature?: string | null) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const sig = signature === undefined ? signBody(raw) : signature
  const res = await POST(webhookRequest(raw, sig))
  return { status: res.status, json: await res.json(), raw }
}

function user(): MemoryUser {
  const row = db.snapshot(WEBHOOK_USER_ID)
  if (!row) throw new Error('webhook user missing')
  return row
}

describe('/api/billing/webhook — end to end', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db = createMemoryAdmin()
    db.seedUser({ id: WEBHOOK_USER_ID, email: 'webhook-e2e@example.com' })
    db.seedUser({ id: BYSTANDER_USER_ID, email: 'bystander@example.com' })
    vi.mocked(createAdminClient).mockReturnValue(
      db.client as unknown as ReturnType<typeof createAdminClient>,
    )
    vi.mocked(getLemonSqueezyConfig).mockReturnValue(makeConfig())
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('webhook e2e must not call fetch'))
  })

  afterEach(() => {
    expect(db.snapshot(BYSTANDER_USER_ID)).toMatchObject({
      subscriptionTier: 'Free',
      subscriptionStatus: null,
      subscriptionRenewsAt: null,
      lemonsqueezyCustomerId: null,
      lemonsqueezySubscriptionId: null,
      lemonsqueezyUpdatedAt: null,
    })
    vi.restoreAllMocks()
  })

  describe('signature', () => {
    it('missing X-Signature → 401 and no ledger row', async () => {
      const res = await post(createdSubscription(), null)
      expect(res.status).toBe(401)
      expect(res.json).toEqual({ error: 'missing signature' })
      expect(db.ledger()).toEqual([])
      expect(user().subscriptionTier).toBe('Free')
    })

    it('malformed signature → 401', async () => {
      const raw = JSON.stringify(createdSubscription())
      expect((await post(raw, 'abc')).status).toBe(401)
      expect((await post(raw, 'z'.repeat(64))).json).toEqual({ error: 'invalid signature' })
      expect(db.ledger()).toEqual([])
    })

    it('wrong secret → 401', async () => {
      const raw = JSON.stringify(createdSubscription())
      const res = await post(raw, signBody(raw, 'other-secret'))
      expect(res.status).toBe(401)
      expect(res.json).toEqual({ error: 'invalid signature' })
      expect(user().subscriptionTier).toBe('Free')
    })

    it('a body that no longer matches the signature → 401 and does not grant Pro', async () => {
      const raw = JSON.stringify(createdSubscription())
      const tampered = raw.replace('"active"', '"active" ')
      const res = await post(tampered, signBody(raw))
      expect(res.status).toBe(401)
      expect(user()).toMatchObject({ subscriptionTier: 'Free', subscriptionStatus: null })
    })

    it('valid signature applies the subscription onto the User row', async () => {
      const body = createdSubscription()
      const res = await post(body)
      expect(res.status).toBe(200)
      expect(res.json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: '2026-11-20T10:00:00.000000Z',
        lemonsqueezyCustomerId: '5829104',
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T0),
      })
      expect(db.ledger()).toEqual([
        expect.objectContaining({
          event_id: createHash('sha256').update(res.raw).digest('hex'),
          event_name: 'subscription_created',
        }),
      ])
      expect(db.audits()[0]).toMatchObject({
        userId: WEBHOOK_USER_ID,
        eventType: 'tier_upgraded',
        status: 'success',
        metadata: { lsEvent: 'subscription_created', lsStatus: 'active', lsSubscriptionId: '847291' },
      })
    })
  })

  describe('idempotency', () => {
    it('the same bytes twice → duplicate ack, one ledger row, user written once', async () => {
      const body = createdSubscription()
      expect((await post(body)).json).toEqual({ ok: true })
      const afterFirst = db.snapshot(WEBHOOK_USER_ID)

      const second = await post(body)
      expect(second.status).toBe(200)
      expect(second.json).toEqual({ ok: true, duplicate: true })
      expect(db.snapshot(WEBHOOK_USER_ID)).toEqual(afterFirst)
      expect(db.ledger()).toHaveLength(1)
      expect(db.audits()).toHaveLength(1)
    })

    it('the same subscription re-encoded with different bytes is not a duplicate, and an equal version stays stale', async () => {
      const body = createdSubscription()
      await post(body)
      const raw = `${JSON.stringify(body)}\n`
      const res = await post(raw, signBody(raw))
      expect(res.json).toEqual({ ok: true, ignored: 'stale' })
      expect(db.ledger()).toHaveLength(2)
      expect(db.audits().map((a) => a.eventType)).toEqual([
        'tier_upgraded',
        'subscription_stale_ignored',
      ])
      expect(user().lemonsqueezyUpdatedAt).toBe(normalizedUpdatedAt(T0))
    })

    it('a non-unique ledger insert error → 500 and the user is untouched so a later retry can insert', async () => {
      db.failNextLedgerInsert('08006', 'connection failure')
      const body = createdSubscription()
      const failed = await post(body)
      expect(failed.status).toBe(500)
      expect(failed.json).toEqual({ error: 'db insert failed' })
      expect(db.ledger()).toEqual([])
      expect(user().subscriptionTier).toBe('Free')

      const retry = await post(body)
      expect(retry.json).toEqual({ ok: true })
      expect(user().subscriptionTier).toBe('Pro')
      expect(db.ledger()).toHaveLength(1)
    })
  })

  describe('out-of-order delivery', () => {
    it('a newer expiry sticks when an older activation, even from another subscription id, arrives afterwards', async () => {
      const expired = createdSubscription({
        eventName: 'subscription_expired',
        status: 'expired',
        statusFormatted: 'Expired',
        updatedAt: T5,
        renewsAt: null,
        endsAt: inDays(-1),
        webhookId: 'expire-first',
      })
      const olderActivation = createdSubscription({
        eventName: 'subscription_updated',
        status: 'active',
        updatedAt: T0,
        subscriptionId: '111',
        webhookId: 'old-subscription',
      })

      expect((await post(expired)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'expired',
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T5),
      })

      const late = await post(olderActivation)
      expect(late.json).toEqual({ ok: true, ignored: 'stale' })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'expired',
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyCustomerId: '5829104',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T5),
      })
      expect(db.audits().map((a) => a.eventType)).toEqual([
        'subscription_updated',
        'subscription_stale_ignored',
      ])
      const stale = db.audits()[1]
      expect(stale).toMatchObject({
        userId: WEBHOOK_USER_ID,
        metadata: {
          lsEvent: 'subscription_updated',
          lsStatus: 'active',
          lsSubscriptionId: '111',
          eventUpdatedAt: normalizedUpdatedAt(T0),
          appliedUpdatedAt: normalizedUpdatedAt(T5),
        },
      })
    })

    it('equal updated_at does not let the second event win', async () => {
      const cancel = createdSubscription({
        eventName: 'subscription_cancelled',
        status: 'cancelled',
        statusFormatted: 'Cancelled',
        cancelled: true,
        updatedAt: T4,
        endsAt: inDays(30),
        webhookId: 'cancel',
      })
      // Same object version, different body — LS emits cancelled + updated together.
      // Status `expired` would drop the user to Free if this write landed.
      const sameVersion = createdSubscription({
        eventName: 'subscription_updated',
        status: 'expired',
        updatedAt: T4,
        endsAt: inDays(-1),
        webhookId: 'same-version',
      })

      await post(cancel)
      expect(user()).toMatchObject({ subscriptionTier: 'Pro', subscriptionStatus: 'cancelled' })

      expect((await post(sameVersion)).json).toEqual({ ok: true, ignored: 'stale' })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'cancelled',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T4),
      })
    })

    it('a payload with no updated_at still applies, and leaves the stored version in place', async () => {
      await post(createdSubscription())
      const unversioned = createdSubscription({
        eventName: 'subscription_updated',
        status: 'past_due',
        omitUpdatedAt: true,
        endsAt: inDays(14),
        webhookId: 'no-version',
      })
      expect((await post(unversioned)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'past_due',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T0),
      })

      const older = createdSubscription({
        eventName: 'subscription_updated',
        status: 'active',
        updatedAt: '2026-10-01T00:00:00.000000Z',
        webhookId: 'before-t0',
      })
      expect((await post(older)).json).toEqual({ ok: true, ignored: 'stale' })
      expect(user().subscriptionStatus).toBe('past_due')
    })
  })

  describe('failed user write releases the ledger claim', () => {
    it('update failure → 500, user unchanged, claim gone; the identical retry applies', async () => {
      const body = createdSubscription()
      db.failNextUserUpdate('connection reset')
      const first = await post(body)
      expect(first.status).toBe(500)
      expect(first.json).toEqual({ error: 'db update failed' })
      expect(db.ledger()).toEqual([])
      expect(db.audits()).toEqual([])
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: null,
        lemonsqueezySubscriptionId: null,
        lemonsqueezyUpdatedAt: null,
      })

      const retry = await post(body)
      expect(retry.json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        lemonsqueezySubscriptionId: '847291',
      })
      expect(db.ledger()).toHaveLength(1)
      expect(db.audits().map((a) => a.eventType)).toEqual(['tier_upgraded'])
    })

    it('when the claim cannot be released, the retry is deduped and the event stays unapplied', async () => {
      const body = createdSubscription()
      db.failNextUserUpdate('connection reset')
      db.failNextLedgerDelete('permission denied')
      const first = await post(body)
      expect(first.status).toBe(500)
      expect(db.ledger()).toHaveLength(1)
      expect(user().subscriptionTier).toBe('Free')
      expect(vi.mocked(console.error)).toHaveBeenCalledWith(
        expect.stringContaining('failed to release ledger row'),
        'subscription_created',
        '847291',
        expect.any(String),
        'permission denied',
      )

      const retry = await post(body)
      expect(retry.json).toEqual({ ok: true, duplicate: true })
      expect(user().subscriptionTier).toBe('Free')
      expect(db.audits()).toEqual([])
    })
  })

  describe('subscription lifecycle', () => {
    it('created → renewal → failed payment → recovery → cancel → resume → expiry, then a late active event', async () => {
      const created = createdSubscription()
      expect((await post(created)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: '2026-11-20T10:00:00.000000Z',
        lemonsqueezyCustomerId: '5829104',
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T0),
      })

      // Invoice events carry status "paid" / "pending". They must not be written
      // onto subscriptionStatus. The subscription_updated that LS sends alongside
      // them is what changes the tier.
      const paid = await post(paidInvoice())
      expect(paid.json).toEqual({ ok: true, ignored: 'subscription_payment_success' })
      expect(user().subscriptionStatus).toBe('active')
      expect(db.ledger()).toHaveLength(1)

      const renewed = createdSubscription({
        eventName: 'subscription_updated',
        status: 'active',
        updatedAt: T1,
        renewsAt: '2026-12-20T10:00:00.000000Z',
        webhookId: 'renewal',
      })
      expect((await post(renewed)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        subscriptionRenewsAt: '2026-12-20T10:00:00.000000Z',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T1),
      })

      const pastDue = createdSubscription({
        eventName: 'subscription_updated',
        status: 'past_due',
        statusFormatted: 'Past due',
        updatedAt: T2,
        // A future ends_at must not keep Pro. That grace is only for `cancelled`.
        endsAt: inDays(14),
        renewsAt: '2026-11-20T10:00:00.000000Z',
        webhookId: 'past-due',
      })
      expect((await post(pastDue)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'past_due',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T2),
      })

      const failedPay = await post(failedInvoice())
      expect(failedPay.json).toEqual({ ok: true, ignored: 'subscription_payment_failed' })
      expect(user()).toMatchObject({ subscriptionTier: 'Free', subscriptionStatus: 'past_due' })

      const recovered = createdSubscription({
        eventName: 'subscription_updated',
        status: 'active',
        updatedAt: T3,
        endsAt: null,
        renewsAt: '2026-12-20T10:00:00.000000Z',
        webhookId: 'recovered',
      })
      expect((await post(recovered)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T3),
      })

      const recoveredInvoice = paidInvoice({ eventName: 'subscription_payment_recovered', webhookId: 'recovered-invoice' })
      expect((await post(recoveredInvoice)).json).toEqual({
        ok: true,
        ignored: 'subscription_payment_recovered',
      })
      expect(user().subscriptionStatus).toBe('active')

      const cancelled = createdSubscription({
        eventName: 'subscription_cancelled',
        status: 'cancelled',
        statusFormatted: 'Cancelled',
        cancelled: true,
        updatedAt: T4,
        endsAt: inDays(30),
        renewsAt: inDays(30),
        webhookId: 'cancel',
      })
      expect((await post(cancelled)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'cancelled',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T4),
      })

      const resumed = createdSubscription({
        eventName: 'subscription_resumed',
        status: 'active',
        updatedAt: T4B,
        endsAt: null,
        cancelled: false,
        renewsAt: '2026-12-20T10:00:00.000000Z',
        webhookId: 'resume-after-cancel',
      })
      expect((await post(resumed)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T4B),
      })

      const expired = createdSubscription({
        eventName: 'subscription_expired',
        status: 'expired',
        statusFormatted: 'Expired',
        updatedAt: T5,
        renewsAt: null,
        endsAt: inDays(-1),
        webhookId: 'expired',
      })
      expect((await post(expired)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'expired',
        subscriptionRenewsAt: null,
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T5),
      })

      const lateActive = createdSubscription({
        eventName: 'subscription_updated',
        status: 'active',
        updatedAt: T1,
        renewsAt: '2026-12-20T10:00:00.000000Z',
        webhookId: 'late-active',
      })
      expect((await post(lateActive)).json).toEqual({ ok: true, ignored: 'stale' })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'expired',
        subscriptionRenewsAt: null,
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt(T5),
      })

      expect(db.audits().map((a) => a.eventType)).toEqual([
        'tier_upgraded',
        'subscription_updated',
        'tier_downgraded',
        'tier_upgraded',
        'subscription_updated',
        'subscription_updated',
        'tier_downgraded',
        'subscription_stale_ignored',
      ])
    })

    it('on_trial grants Pro', async () => {
      const trial = createdSubscription({
        status: 'on_trial',
        statusFormatted: 'On trial',
        webhookId: 'trial',
      })
      expect((await post(trial)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({ subscriptionTier: 'Pro', subscriptionStatus: 'on_trial' })
    })

    it('pause drops to Free even with ends_at still in the future; unpause restores Pro; the older pause does not stick', async () => {
      await post(createdSubscription())

      const paused = pausedSubscription({ endsAt: inDays(40) })
      expect((await post(paused)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Free',
        subscriptionStatus: 'paused',
        lemonsqueezySubscriptionId: '847291',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt('2026-10-22T13:37:27.000000Z'),
      })
      expect(db.audits().at(-1)?.eventType).toBe('tier_downgraded')

      // subscription_updated for the same pause carries the same updated_at, so
      // once subscription_paused has applied it is stale rather than a second write.
      const viaUpdated = createdSubscription({
        eventName: 'subscription_updated',
        status: 'paused',
        updatedAt: '2026-10-22T13:37:27.000000Z',
        endsAt: inDays(40),
        pause: { mode: 'void', resumes_at: null },
        webhookId: 'pause-via-updated',
      })
      expect((await post(viaUpdated)).json).toEqual({ ok: true, ignored: 'stale' })

      const unpaused = pausedSubscription({
        eventName: 'subscription_unpaused',
        status: 'active',
        statusFormatted: 'Active',
        updatedAt: '2026-10-23T09:00:00.000000Z',
        endsAt: null,
        pause: null,
        webhookId: 'unpause',
      })
      expect((await post(unpaused)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({
        subscriptionTier: 'Pro',
        subscriptionStatus: 'active',
        lemonsqueezyUpdatedAt: normalizedUpdatedAt('2026-10-23T09:00:00.000000Z'),
      })

      const latePause = pausedSubscription({
        endsAt: inDays(40),
        webhookId: 'late-pause',
      })
      expect((await post(latePause)).json).toEqual({ ok: true, ignored: 'stale' })
      expect(user()).toMatchObject({ subscriptionTier: 'Pro', subscriptionStatus: 'active' })
    })

    it('subscription_updated paused, with no dedicated pause event, still drops to Free', async () => {
      await post(createdSubscription())
      const paused = createdSubscription({
        eventName: 'subscription_updated',
        status: 'paused',
        updatedAt: '2026-10-22T13:37:27.000000Z',
        endsAt: inDays(40),
        pause: { mode: 'void', resumes_at: null },
        webhookId: 'pause-updated-only',
      })
      expect((await post(paused)).json).toEqual({ ok: true })
      expect(user()).toMatchObject({ subscriptionTier: 'Free', subscriptionStatus: 'paused' })
    })
  })

  describe('acks that must not retry', () => {
    it('billing env unset → 200 without reading the signature or the database', async () => {
      vi.mocked(getLemonSqueezyConfig).mockReturnValue(null)
      const res = await post(createdSubscription(), null)
      expect(res.status).toBe(200)
      expect(res.json).toEqual({ ok: true, note: 'billing not configured' })
      expect(createAdminClient).not.toHaveBeenCalled()
      expect(user().subscriptionTier).toBe('Free')
    })

    it('invalid JSON → 400', async () => {
      const raw = '{'
      const res = await post(raw, signBody(raw))
      expect(res.status).toBe(400)
      expect(res.json).toEqual({ error: 'invalid json' })
      expect(db.ledger()).toEqual([])
    })

    it('order_created is acknowledged and does not touch the user', async () => {
      const before = db.snapshot(WEBHOOK_USER_ID)
      const order = {
        meta: {
          event_name: 'order_created',
          custom_data: { user_id: WEBHOOK_USER_ID },
          webhook_id: 'order-1',
        },
        data: {
          type: 'orders',
          id: '501',
          attributes: {
            status: 'paid',
            customer_id: 5829104,
            total: 1999,
            updated_at: T1,
          },
        },
      }
      const res = await post(order as unknown as LsWebhook)
      expect(res.json).toEqual({ ok: true, ignored: 'order_created' })
      expect(db.snapshot(WEBHOOK_USER_ID)).toEqual(before)
      expect(db.ledger()).toEqual([])
    })

    it('missing user_id → 400', async () => {
      const body = createdSubscription()
      delete body.meta.custom_data
      const res = await post(body)
      expect(res.status).toBe(400)
      expect(res.json).toEqual({ error: 'missing user_id' })
      expect(db.ledger()).toEqual([])
    })

    it('non-UUID user_id → 200 and no database write', async () => {
      const body = createdSubscription({ userId: 'not-a-uuid' })
      const res = await post(body)
      expect(res.json).toEqual({ ok: true, ignored: 'invalid user_id' })
      expect(db.ledger()).toEqual([])
      expect(db.audits()).toEqual([])
      expect(user().subscriptionTier).toBe('Free')
    })

    it('user_id nested on data.meta.custom_data is accepted', async () => {
      const body = createdSubscription()
      delete body.meta.custom_data
      body.data.meta = { custom_data: { user_id: WEBHOOK_USER_ID } }
      expect((await post(body)).json).toEqual({ ok: true })
      expect(user().subscriptionTier).toBe('Pro')
    })

    it('valid UUID with no User row → 200, orphan audit with a null userId, claim kept', async () => {
      const missingId = 'a0000000-0000-4000-8000-000000000099'
      const body = createdSubscription({ userId: missingId, webhookId: 'orphan' })
      const res = await post(body)
      expect(res.json).toEqual({ ok: true, ignored: 'user_not_found' })
      expect(db.snapshot(missingId)).toBeNull()
      expect(db.audits()).toEqual([
        expect.objectContaining({
          userId: null,
          eventType: 'subscription_orphaned',
          status: 'failure',
          metadata: expect.objectContaining({
            lsUserId: missingId,
            lsEvent: 'subscription_created',
            lsSubscriptionId: '847291',
          }),
        }),
      ])
      expect(db.ledger()).toHaveLength(1)

      const retry = await post(body)
      expect(retry.json).toEqual({ ok: true, duplicate: true })
      expect(db.audits()).toHaveLength(1)
    })
  })
})
