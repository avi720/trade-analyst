import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/types'
import {
  consentAllowsServerEvent,
  readAnalyticsOptIn,
} from '@/lib/analytics/analytics-opt-in'
import { captureServerEvent, type ServerEvent } from '@/lib/analytics/posthog-server'
import { readRequestConsent } from '@/lib/analytics/request-consent'

export const FIRST_TRADE_EVENT = 'first_trade_created'

export const FIRST_TRADE_SOURCES = ['manual', 'excel', 'ai_import', 'ibkr'] as const

export type FirstTradeSource = (typeof FIRST_TRADE_SOURCES)[number]

export type ServerCapture = (event: ServerEvent) => Promise<void>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** Users this process already emitted for. Stops a double call on one instance. */
const emittedUserIds = new Set<string>()

/**
 * Deterministic UUID for this user's first-trade event. PostHog dedupes on
 * uuid, so a retried delivery of the same conversion does not double-count.
 */
export function firstTradeEventUuid(userId: string): string {
  const hex = createHash('sha256').update(`${FIRST_TRADE_EVENT}:${userId}`).digest('hex')
  const chars = hex.slice(0, 32).split('')
  chars[12] = '4'
  chars[16] = '8'
  const h = chars.join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

export function isFirstTradeEventUuid(uuid: string): boolean {
  return UUID_RE.test(uuid)
}

export interface FirstTradeDecisionInput {
  /** Trade rows for this user before the write. */
  priorTradeCount: number
  /** Distinct Trade rows this write inserted (OPEN / REVERSAL). */
  openedTradeCount: number
  /** Trade rows for this user after the write committed. */
  tradeCountAfter: number
  analyticsOptIn: boolean
}

/**
 * Fire only for the write that takes a user from zero trades to one or more,
 * and only when that write accounts for every trade they now have.
 *
 * A concurrent writer makes `tradeCountAfter` larger than `openedTradeCount`
 * on both sides, so both suppress. That is at most one event: exactly one in
 * the sequential case the product actually produces (one import or one sync).
 */
export function shouldEmitFirstTrade(input: FirstTradeDecisionInput): boolean {
  if (!input.analyticsOptIn) return false
  if (!Number.isInteger(input.priorTradeCount) || input.priorTradeCount !== 0) return false
  if (!Number.isInteger(input.openedTradeCount) || input.openedTradeCount <= 0) return false
  if (!Number.isInteger(input.tradeCountAfter) || input.tradeCountAfter !== input.openedTradeCount) {
    return false
  }
  return true
}

export interface FirstTradeTrackInput extends FirstTradeDecisionInput {
  userId: string
  source: FirstTradeSource
}

/** Test hook. The production set lives for the life of the server process. */
export function resetFirstTradeTrackingForTests(): void {
  emittedUserIds.clear()
}

/**
 * Emit `first_trade_created` at most once per user in this process.
 * Returns whether a capture was attempted. Capture errors are swallowed so
 * trade persistence never fails because analytics did.
 */
export async function trackFirstTradeCreated(
  input: FirstTradeTrackInput,
  capture: ServerCapture = captureServerEvent,
): Promise<boolean> {
  if (!FIRST_TRADE_SOURCES.includes(input.source)) return false
  if (!shouldEmitFirstTrade(input)) return false
  if (emittedUserIds.has(input.userId)) return false
  emittedUserIds.add(input.userId)
  try {
    await capture({
      distinctId: input.userId,
      event: FIRST_TRADE_EVENT,
      properties: { source: input.source },
      uuid: firstTradeEventUuid(input.userId),
    })
    return true
  } catch (err) {
    emittedUserIds.delete(input.userId)
    console.error('[analytics] first_trade_created failed:', err instanceof Error ? err.message : err)
    return false
  }
}

type Admin = SupabaseClient<Database>

export async function countUserTrades(admin: Admin, userId: string): Promise<number> {
  const { count, error } = await admin
    .from('Trade')
    .select('*', { count: 'exact', head: true })
    .eq('userId', userId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function readStoredAnalyticsOptIn(admin: Admin, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('User')
    .select('settings')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return readAnalyticsOptIn(data?.settings)
}

/**
 * Called after a trade-creating batch. No-ops unless this batch opened the
 * user's first trade and analytics consent is on. Never throws.
 */
export async function observeFirstTrade(args: {
  admin: Admin
  userId: string
  source: FirstTradeSource
  priorTradeCount: number
  openedTradeIds: readonly string[]
}): Promise<void> {
  try {
    const openedTradeCount = new Set(args.openedTradeIds.filter((id) => id.length > 0)).size
    if (args.priorTradeCount !== 0 || openedTradeCount === 0) return

    const requestConsent = await readRequestConsent()
    const settingsOptIn = requestConsent?.decided
      ? false
      : await readStoredAnalyticsOptIn(args.admin, args.userId)
    const analyticsOptIn = consentAllowsServerEvent(requestConsent, settingsOptIn)
    if (!analyticsOptIn) return

    const tradeCountAfter = await countUserTrades(args.admin, args.userId)
    await trackFirstTradeCreated({
      userId: args.userId,
      source: args.source,
      priorTradeCount: args.priorTradeCount,
      openedTradeCount,
      tradeCountAfter,
      analyticsOptIn,
    })
  } catch (err) {
    console.error('[analytics] first_trade_created skipped:', err instanceof Error ? err.message : err)
  }
}
