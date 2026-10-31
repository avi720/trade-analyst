import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getUserTier, isProTier, proRequiredResponse } from '@/lib/billing/tier'
import { tradesToCsv, type CsvTrade } from '@/lib/trade/trades-csv'

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

// Exports the trades the search tab currently shows, in the order it shows them.
// All of the user's rows are read and filtered here because a long id list does
// not fit in a PostgREST `in` filter.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier } = await getUserTier(user.id)
  if (!isProTier(tier)) return proRequiredResponse('csv_export')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'בקשה לא תקינה', details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('Trade')
    .select(
      'id, ticker, direction, status, source, closeReason, setupType, tags, openedAt, closedAt, actualR, plannedR, realizedPnl, totalCommission, result, notes, emotionalState, executionQuality, stopPrice, targetPrice, didRight, wouldChange, avgEntryPrice, avgExitPrice, totalQuantityOpened, totalQuantity'
    )
  if (error) return NextResponse.json({ error: 'טעינת הטריידים נכשלה' }, { status: 500 })

  const byId = new Map((data ?? []).map(t => [t.id, t]))
  const trades = parsed.data.ids.flatMap(id => byId.get(id) ?? []) as CsvTrade[]

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(tradesToCsv(trades), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="trades_${date}.csv"`,
    },
  })
}
