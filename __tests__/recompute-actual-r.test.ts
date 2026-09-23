import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/types'
import { recomputeActualR } from '@/lib/trade/recompute-actual-r'

type Row = {
  status: string
  realizedPnl: number | null
  avgEntryPrice: number
  stopPrice: number | null
  totalQuantityOpened: number
  actualR: number | null
  result: string | null
}

// Minimal chainable stub: select(...).eq().eq().maybeSingle() and update(...).eq().eq()
function stub(row: Row | null) {
  const update = vi.fn()
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }),
      update: (patch: unknown) => {
        update(patch)
        return { eq: () => ({ eq: async () => ({ error: null }) }) }
      },
    }),
  }
  return { client: client as unknown as SupabaseClient<Database>, update }
}

const closedLoss: Row = {
  status: 'Closed', realizedPnl: -100, avgEntryPrice: 100, stopPrice: 90,
  totalQuantityOpened: 10, actualR: -1, result: 'Loss',
}

describe('recomputeActualR', () => {
  it('derives actualR from a newly written stop', async () => {
    const { client, update } = stub({ ...closedLoss, stopPrice: 95, actualR: null, result: 'Loss' })
    await recomputeActualR(client, 't1', 'u1')
    expect(update).toHaveBeenCalledWith({ actualR: -2, result: 'Loss' })
  })

  it('clears actualR when the stop is removed from a closed trade', async () => {
    const { client, update } = stub({ ...closedLoss, stopPrice: null })
    await recomputeActualR(client, 't1', 'u1')
    expect(update).toHaveBeenCalledWith({ actualR: null, result: 'Loss' })
  })

  it('falls back to the $-based result when the stop is cleared on a winner', async () => {
    const { client, update } = stub({ ...closedLoss, realizedPnl: 50, stopPrice: null, actualR: 0.5, result: 'Win' })
    await recomputeActualR(client, 't1', 'u1')
    expect(update).toHaveBeenCalledWith({ actualR: null, result: 'Win' })
  })

  it('skips the write when nothing changed', async () => {
    const { client, update } = stub(closedLoss)
    await recomputeActualR(client, 't1', 'u1')
    expect(update).not.toHaveBeenCalled()
  })

  it('is a no-op for open trades', async () => {
    const { client, update } = stub({ ...closedLoss, status: 'Open', stopPrice: null })
    await recomputeActualR(client, 't1', 'u1')
    expect(update).not.toHaveBeenCalled()
  })
})
