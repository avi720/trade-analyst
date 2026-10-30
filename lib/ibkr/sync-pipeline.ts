import type { SupabaseClient } from '@supabase/supabase-js'
import { IBRIT_BROKER_NAME } from '@/lib/ibkr/broker-names'
import { syncIbritConnection } from '@/lib/ibkr/ibrit-sync'
import type { Database } from '@/lib/db/types'

type Admin = SupabaseClient<Database>

// The two flex* columns hold the IBRIT Web Service token and query ID. The names
// predate IBRIT; renaming them is a separate two-step migration.
export interface ConnectionRow {
  id: string
  userId: string
  brokerName: string
  flexTokenEncrypted: string
  flexQueryIdActivity: string
}

export interface ConnectionResult {
  connectionId: string
  userId: string
  // TOKEN_INVALID: IBKR rejected the stored IBRIT token (expired or revoked);
  // only the user can fix it, by renewing it.
  status: 'SUCCESS' | 'ERROR' | 'TRANSIENT_ERROR' | 'TOKEN_INVALID'
  error: string | null
  executions: number
  failedExecutions: number
}

// Fetch + parse + processExecutions + BrokerEvent audit + BrokerConnection
// status update for one connection. Shared by the
// scheduled cron ([app/api/cron/ibkr-sync/route.ts]), the on-demand admin
// trigger ([app/api/admin/ibkr/[connectionId]/sync/route.ts]) and the IBRIT
// connect route's first sync.
export async function syncOneConnection(
  admin: Admin,
  conn: ConnectionRow,
): Promise<ConnectionResult> {
  if (conn.brokerName !== IBRIT_BROKER_NAME) {
    // Never send another feed's credentials to the IBRIT service.
    return {
      connectionId: conn.id,
      userId: conn.userId,
      status: 'ERROR',
      error: `Unsupported broker: ${conn.brokerName}`,
      executions: 0,
      failedExecutions: 0,
    }
  }
  return syncIbritConnection(admin, conn)
}

// Fan out syncOneConnection across every active BrokerConnection.
// Used by the scheduled cron. Parallel dispatch — IBKR rate limits are
// per-token, so different users' syncs are independent.
export async function syncActiveConnections(
  admin: Admin,
): Promise<ConnectionResult[]> {
  const { data: conns, error: connErr } = await admin
    .from('BrokerConnection')
    .select('id, userId, brokerName, flexTokenEncrypted, flexQueryIdActivity')
    .eq('isActive', true)

  if (connErr) {
    throw new Error(`Failed to load connections: ${connErr.message}`)
  }
  if (!conns || conns.length === 0) return []

  console.log(`[sync-pipeline] processing ${conns.length} active connection(s)`)

  const settled = await Promise.allSettled(
    (conns as ConnectionRow[]).map(conn => syncOneConnection(admin, conn)),
  )

  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    // syncOneConnection is expected to swallow known errors and return a
    // ConnectionResult; synthesize an ERROR result on unexpected throws.
    const conn = (conns as ConnectionRow[])[i]
    const msg = s.reason instanceof Error ? s.reason.message : String(s.reason)
    console.error(
      `[sync-pipeline] unhandled error for conn=${conn.id}:`,
      msg,
    )
    return {
      connectionId: conn.id,
      userId: conn.userId,
      status: 'ERROR',
      error: msg,
      executions: 0,
      failedExecutions: 0,
    }
  })
}
