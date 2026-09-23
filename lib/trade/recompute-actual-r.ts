/**
 * Recompute a closed Trade's actualR (and result) after its stopPrice has been
 * persisted.
 *
 * Why this exists: the manual-entry flows persist the stopPrice as a Trade-level
 * annotation *after* the FIFO close has already run. At close time the trade's
 * stopPrice was still null, so the CLOSE action computed actualR = null. Once the
 * stop is written we can derive the R-multiple, which feeds the research-tab
 * R metrics (avg R, expectancy, equity curve, R distribution).
 *
 * The reverse holds too: a stop cleared (or made unusable) on a closed trade
 * leaves nothing to measure R against, so actualR goes back to null and result
 * falls back to the $-based classification — exactly what the FIFO close would
 * have produced with no stop.
 *
 * Idempotent: when actualR was already computed by FIFO (open + close in separate
 * submissions), recomputing yields the same value.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calcActualR, resultFromR } from './fifo'
import type { Database } from '@/lib/db/types'

/**
 * Reads the trade, and if it is Closed, re-derives actualR + result from its
 * current stopPrice and persists them when they changed. No-op for open trades.
 */
export async function recomputeActualR(
  admin: SupabaseClient<Database>,
  tradeId: string,
  userId: string,
): Promise<void> {
  const { data: t } = await admin
    .from('Trade')
    .select('status, realizedPnl, avgEntryPrice, stopPrice, totalQuantityOpened, actualR, result')
    .eq('id', tradeId)
    .eq('userId', userId)
    .maybeSingle()

  if (!t || t.status !== 'Closed') return

  const realizedPnl = t.realizedPnl ?? 0
  const actualR = t.stopPrice == null
    ? null
    : calcActualR(realizedPnl, t.avgEntryPrice, t.stopPrice, t.totalQuantityOpened)
  const result = resultFromR(actualR, realizedPnl)

  if (actualR === t.actualR && result === t.result) return

  await admin
    .from('Trade')
    .update({ actualR, result })
    .eq('id', tradeId)
    .eq('userId', userId)
}
