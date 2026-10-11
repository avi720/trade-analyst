import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronSecret } from '@/lib/auth/cron-secret'
import { syncActiveConnections } from '@/lib/ibkr/sync-pipeline'
import { sendIbritTokenExpiryReminders, type ReminderRunResult } from '@/lib/ibkr/ibrit-token-reminders'

export const maxDuration = 300

// Secured with CRON_SECRET header — called by GitHub Actions at 13:00 & 20:00 UTC daily.
// The per-connection sync logic lives in lib/ibkr/sync-pipeline.ts and is
// shared with the on-demand admin trigger. IBRIT token expiry reminders run
// alongside the sync, independently of it.
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get('Authorization'))) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  const [synced, reminded] = await Promise.allSettled([
    syncActiveConnections(admin),
    sendIbritTokenExpiryReminders(admin),
  ])

  let reminders: ReminderRunResult | { error: string }
  if (reminded.status === 'fulfilled') {
    reminders = reminded.value
  } else {
    const msg = reminded.reason instanceof Error ? reminded.reason.message : String(reminded.reason)
    console.error('[cron/ibkr-sync] token reminders failed:', msg)
    reminders = { error: msg }
  }
  // Only a run that couldn't reach the mailbox or the DB fails. A single
  // rejected recipient is retried by the next run and reported in `reminders`,
  // so it doesn't keep the whole cron red.
  const remindersOk = 'sent' in reminders

  if (synced.status === 'rejected') {
    const msg = synced.reason instanceof Error ? synced.reason.message : String(synced.reason)
    console.error('[cron/ibkr-sync] pipeline failed:', msg)
    return NextResponse.json({ error: 'DB error', reminders }, { status: 500 })
  }
  const results = synced.value

  if (results.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: 'No active connections',
      processed: 0,
      reminders,
    })
  }

  const success = results.filter(r => r.status === 'SUCCESS').length
  const errored = results.filter(r => r.status === 'ERROR').length
  const transient = results.filter(r => r.status === 'TRANSIENT_ERROR').length
  // A user's expired token is theirs to renew, not a failed run.
  const tokenInvalid = results.filter(r => r.status === 'TOKEN_INVALID').length

  return NextResponse.json({
    ok: errored === 0 && remindersOk,
    total: results.length,
    success,
    errored,
    transient,
    tokenInvalid,
    reminders,
    results,
  })
}
