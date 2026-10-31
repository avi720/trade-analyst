import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { readAnalyticsOptIn, withAnalyticsOptIn } from '@/lib/analytics/analytics-opt-in'
import type { Json } from '@/lib/db/types'

const schema = z.object({ analytics: z.boolean() })

/**
 * Persist analytics opt-in on the user row so a later server-side event
 * (IBKR sync has no browser) can respect the same choice as the cookie.
 * Idempotent: a matching flag does not write.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'נתונים לא תקינים' }, { status: 400 })
  }

  const { data: existing, error: readError } = await supabase
    .from('User')
    .select('settings')
    .eq('id', user.id)
    .maybeSingle()

  if (readError) {
    console.error('[analytics-consent] read failed:', readError.message)
    return NextResponse.json({ error: 'שגיאה בשמירת ההעדפה' }, { status: 500 })
  }

  // The row is created by the dashboard layout or signup-complete. Until then
  // there is nothing to update; the next signed-in load retries.
  if (!existing) return NextResponse.json({ ok: true, stored: false })

  const current = existing.settings
  if (
    readAnalyticsOptIn(current) === parsed.data.analytics &&
    current !== null &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    'analyticsOptIn' in current
  ) {
    return NextResponse.json({ ok: true, stored: true })
  }

  const { error: updateError } = await supabase
    .from('User')
    .update({ settings: withAnalyticsOptIn(current, parsed.data.analytics) as Json })
    .eq('id', user.id)

  if (updateError) {
    console.error('[analytics-consent] update failed:', updateError.message)
    return NextResponse.json({ error: 'שגיאה בשמירת ההעדפה' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, stored: true })
}
