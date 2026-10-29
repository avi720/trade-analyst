import { createHmac } from 'crypto'
import createdJson from '../fixtures/lemonsqueezy/subscription-created.json'
import pausedJson from '../fixtures/lemonsqueezy/subscription-paused.json'
import invoicePaidJson from '../fixtures/lemonsqueezy/subscription-invoice-paid.json'
import invoiceFailedJson from '../fixtures/lemonsqueezy/subscription-invoice-failed.json'

/** Fixed ids — this suite never opens a Supabase connection, so they are not integration-suite rows. */
export const WEBHOOK_USER_ID = 'a0000000-0000-4000-8000-000000000027'
export const BYSTANDER_USER_ID = 'a0000000-0000-4000-8000-000000000028'
export const TEST_WEBHOOK_SECRET = 'test-webhook-secret'

export interface LsWebhook {
  meta: {
    test_mode?: boolean
    event_name: string
    webhook_id?: string
    custom_data?: { user_id?: string }
  }
  data: {
    type: string
    id: string
    attributes: {
      status: string
      customer_id: number
      renews_at?: string | null
      ends_at?: string | null
      updated_at?: string | null
      status_formatted?: string
      pause?: { mode: string; resumes_at: string | null } | null
      cancelled?: boolean
      billing_reason?: string
      [key: string]: unknown
    }
    meta?: { custom_data?: { user_id?: string } }
    relationships?: unknown
    links?: unknown
  }
}

export interface SubscriptionPatch {
  eventName?: string
  status?: string
  statusFormatted?: string
  /** Microsecond LS timestamps are realistic; the handler normalizes on write. */
  updatedAt?: string
  omitUpdatedAt?: boolean
  endsAt?: string | null
  renewsAt?: string | null
  userId?: string
  webhookId?: string
  cancelled?: boolean
  pause?: { mode: string; resumes_at: string | null } | null
  subscriptionId?: string
}

function cloneWebhook(json: unknown): LsWebhook {
  return structuredClone(json) as LsWebhook
}

export function createdSubscription(patch?: SubscriptionPatch): LsWebhook {
  return subscriptionEvent(cloneWebhook(createdJson), patch)
}

export function pausedSubscription(patch?: SubscriptionPatch): LsWebhook {
  return subscriptionEvent(cloneWebhook(pausedJson), patch)
}

export function paidInvoice(patch?: { eventName?: string; webhookId?: string }): LsWebhook {
  const body = cloneWebhook(invoicePaidJson)
  if (patch?.eventName) body.meta.event_name = patch.eventName
  if (patch?.webhookId) body.meta.webhook_id = patch.webhookId
  return body
}

export function failedInvoice(): LsWebhook {
  return cloneWebhook(invoiceFailedJson)
}

export function subscriptionEvent(base: LsWebhook, patch: SubscriptionPatch = {}): LsWebhook {
  const body = structuredClone(base)
  if (patch.eventName) body.meta.event_name = patch.eventName
  if (patch.webhookId) body.meta.webhook_id = patch.webhookId
  if (patch.userId) {
    body.meta.custom_data = { ...(body.meta.custom_data ?? {}), user_id: patch.userId }
  }
  if (patch.subscriptionId) body.data.id = patch.subscriptionId
  if (patch.status) body.data.attributes.status = patch.status
  if (patch.statusFormatted) body.data.attributes.status_formatted = patch.statusFormatted
  if (patch.updatedAt) body.data.attributes.updated_at = patch.updatedAt
  if (patch.omitUpdatedAt) delete body.data.attributes.updated_at
  if (patch.endsAt !== undefined) body.data.attributes.ends_at = patch.endsAt
  if (patch.renewsAt !== undefined) body.data.attributes.renews_at = patch.renewsAt
  if (patch.cancelled !== undefined) body.data.attributes.cancelled = patch.cancelled
  if (patch.pause !== undefined) body.data.attributes.pause = patch.pause
  return body
}

export function signBody(raw: string, secret: string = TEST_WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(raw).digest('hex')
}

export function webhookRequest(raw: string, signature: string | null): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signature !== null) headers['X-Signature'] = signature
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    body: raw,
    headers,
  })
}

/** What the handler stores for `lemonsqueezyUpdatedAt` (ms precision, UTC). */
export function normalizedUpdatedAt(lsTimestamp: string): string {
  return new Date(lsTimestamp).toISOString()
}
