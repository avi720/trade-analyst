/**
 * In-memory stand-in for the service-role Supabase client used by the
 * Lemon Squeezy webhook (and by `logAuditEvent`, which calls
 * `createAdminClient()` again).
 *
 * It implements only the chain the handler uses, with the Postgres behaviours
 * that chain depends on:
 *   - UNIQUE(event_id) → 23505, and the row is not inserted
 *   - AuditEvent.userId FK → 23503 when the user does not exist
 *   - UPDATE ... WHERE id = $1 AND (version IS NULL OR version < $2)
 *     evaluated against stored rows, not against a scripted return value
 *   - a failed update writes nothing
 *
 * Snapshots returned to the caller are copies. The handler reads `prior`
 * and then updates; if those shared one object the audit tier would be wrong.
 */

export interface MemoryUser {
  id: string
  email: string
  subscriptionTier: 'Free' | 'Pro'
  subscriptionStatus: string | null
  subscriptionRenewsAt: string | null
  lemonsqueezyCustomerId: string | null
  lemonsqueezySubscriptionId: string | null
  lemonsqueezyUpdatedAt: string | null
}

export interface MemoryLedgerRow {
  id: string
  event_id: string
  event_name: string
  received_at: string
}

export interface MemoryAuditRow {
  id: string
  userId: string | null
  eventType: string
  status: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface DbError {
  code: string
  message: string
}

type Row = Record<string, unknown>

export interface MemoryAdmin {
  client: { from: (table: string) => unknown }
  seedUser: (partial: Pick<MemoryUser, 'id' | 'email'> & Partial<MemoryUser>) => MemoryUser
  snapshot: (userId: string) => MemoryUser | null
  ledger: () => MemoryLedgerRow[]
  audits: () => MemoryAuditRow[]
  failNextUserUpdate: (message: string) => void
  failNextLedgerDelete: (message: string) => void
  failNextLedgerInsert: (code: string, message: string) => void
}

export function createMemoryAdmin(): MemoryAdmin {
  const users = new Map<string, MemoryUser>()
  const ledger = new Map<string, MemoryLedgerRow>()
  const audits: MemoryAuditRow[] = []
  const faults: {
    userUpdate: DbError | null
    ledgerDelete: DbError | null
    ledgerInsert: DbError | null
  } = { userUpdate: null, ledgerDelete: null, ledgerInsert: null }

  function seedUser(partial: Pick<MemoryUser, 'id' | 'email'> & Partial<MemoryUser>): MemoryUser {
    const row: MemoryUser = {
      id: partial.id,
      email: partial.email,
      subscriptionTier: partial.subscriptionTier ?? 'Free',
      subscriptionStatus: partial.subscriptionStatus ?? null,
      subscriptionRenewsAt: partial.subscriptionRenewsAt ?? null,
      lemonsqueezyCustomerId: partial.lemonsqueezyCustomerId ?? null,
      lemonsqueezySubscriptionId: partial.lemonsqueezySubscriptionId ?? null,
      lemonsqueezyUpdatedAt: partial.lemonsqueezyUpdatedAt ?? null,
    }
    users.set(row.id, row)
    return structuredClone(row)
  }

  function project(row: Row, cols: string): Row {
    const out: Row = {}
    for (const col of cols.split(',').map((c) => c.trim()).filter(Boolean)) {
      out[col] = row[col] ?? null
    }
    return out
  }

  function matchesPredicate(row: Row, predicate: string): boolean {
    const isNull = /^([A-Za-z0-9_]+)\.is\.null$/.exec(predicate)
    if (isNull) return row[isNull[1]] == null

    const cmp = /^([A-Za-z0-9_]+)\.(eq|neq|lt|lte|gt|gte)\.(.+)$/.exec(predicate)
    if (!cmp) throw new Error(`memory admin: unparsed filter predicate: ${predicate}`)
    const [, col, op, raw] = cmp
    const left = row[col]
    if (left == null) return false
    if (op === 'eq') return String(left) === raw
    if (op === 'neq') return String(left) !== raw

    const lTime = Date.parse(String(left))
    const rTime = Date.parse(raw)
    const useTime = Number.isFinite(lTime) && Number.isFinite(rTime)
    const l = useTime ? lTime : String(left)
    const r = useTime ? rTime : raw
    if (op === 'lt') return l < r
    if (op === 'lte') return l <= r
    if (op === 'gt') return l > r
    return l >= r
  }

  // PostgREST `or=(a,b)` — comma separates predicates; values here are ISO
  // timestamps and do not contain commas. `.` inside a timestamp stays in the value.
  function matchesOr(row: Row, filter: string): boolean {
    return filter.split(',').some((predicate) => matchesPredicate(row, predicate))
  }

  function applyPatch(row: Row, patch: Row) {
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) row[key] = value
    }
  }

  function from(table: string) {
    if (table === 'BillingWebhookEvent') {
      return {
        insert: async (row: { event_id: string; event_name: string }) => {
          if (faults.ledgerInsert) {
            const error = faults.ledgerInsert
            faults.ledgerInsert = null
            return { data: null, error }
          }
          if (ledger.has(row.event_id)) {
            return {
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "BillingWebhookEvent_event_id_key"',
              },
            }
          }
          ledger.set(row.event_id, {
            id: crypto.randomUUID(),
            event_id: row.event_id,
            event_name: row.event_name,
            received_at: new Date().toISOString(),
          })
          return { data: null, error: null }
        },
        delete: () => ({
          eq: async (col: string, value: string) => {
            if (col !== 'event_id') {
              throw new Error(`memory admin: unexpected BillingWebhookEvent delete filter ${col}`)
            }
            if (faults.ledgerDelete) {
              const error = faults.ledgerDelete
              faults.ledgerDelete = null
              return { data: null, error }
            }
            ledger.delete(value)
            return { data: null, error: null }
          },
        }),
      }
    }

    if (table === 'User') {
      return {
        select: (cols: string) => {
          const eqs: Array<[string, unknown]> = []
          const chain = {
            eq(col: string, value: unknown) {
              eqs.push([col, value])
              return chain
            },
            maybeSingle: async () => {
              const matched = [...users.values()].filter((row) =>
                eqs.every(([col, value]) => (row as unknown as Row)[col] === value),
              )
              if (matched.length > 1) {
                return { data: null, error: { code: 'PGRST116', message: 'multiple rows returned' } }
              }
              const row = matched[0]
              return {
                data: row ? project(structuredClone(row) as unknown as Row, cols) : null,
                error: null,
              }
            },
          }
          return chain
        },
        update: (patch: Row) => {
          const eqs: Array<[string, unknown]> = []
          let orFilter: string | null = null
          const chain = {
            eq(col: string, value: unknown) {
              eqs.push([col, value])
              return chain
            },
            or(filter: string) {
              orFilter = filter
              return chain
            },
            select: async (cols: string) => {
              if (faults.userUpdate) {
                const error = faults.userUpdate
                faults.userUpdate = null
                return { data: null, error }
              }
              const updated: Row[] = []
              for (const [id, row] of users) {
                const current = row as unknown as Row
                if (!eqs.every(([col, value]) => current[col] === value)) continue
                if (orFilter && !matchesOr(current, orFilter)) continue
                const next = structuredClone(row)
                applyPatch(next as unknown as Row, patch)
                users.set(id, next)
                updated.push(project(next as unknown as Row, cols))
              }
              return { data: updated, error: null }
            },
          }
          return chain
        },
      }
    }

    if (table === 'AuditEvent') {
      return {
        insert: async (row: {
          userId: string | null
          eventType: string
          status: string
          metadata: Record<string, unknown> | null
          ipAddress: string | null
          userAgent: string | null
        }) => {
          if (row.userId != null && !users.has(row.userId)) {
            return {
              data: null,
              error: {
                code: '23503',
                message: 'insert or update on table "AuditEvent" violates foreign key constraint "AuditEvent_userId_fkey"',
              },
            }
          }
          audits.push({
            id: crypto.randomUUID(),
            userId: row.userId,
            eventType: row.eventType,
            status: row.status,
            metadata: row.metadata,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            createdAt: new Date().toISOString(),
          })
          return { data: null, error: null }
        },
      }
    }

    throw new Error(`memory admin: unexpected table ${table}`)
  }

  return {
    client: { from },
    seedUser,
    snapshot: (userId) => {
      const row = users.get(userId)
      return row ? structuredClone(row) : null
    },
    ledger: () => [...ledger.values()].map((row) => structuredClone(row)),
    audits: () => audits.map((row) => structuredClone(row)),
    failNextUserUpdate: (message) => {
      faults.userUpdate = { code: '08006', message }
    },
    failNextLedgerDelete: (message) => {
      faults.ledgerDelete = { code: '42501', message }
    },
    failNextLedgerInsert: (code, message) => {
      faults.ledgerInsert = { code, message }
    },
  }
}
