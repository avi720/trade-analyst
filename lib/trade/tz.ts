export const TRADE_TIMEZONES = [
  { label: 'ישראל (UTC±2/3)',  value: 'Asia/Jerusalem'   },
  { label: 'UTC',               value: 'UTC'              },
  { label: 'ניו יורק (UTC±5)', value: 'America/New_York' },
  { label: 'שיקגו (UTC±6)',    value: 'America/Chicago'  },
]

export const DEFAULT_TIMEZONE = 'Asia/Jerusalem'

function getTzOffsetMs(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value)
  let h = get('hour')
  if (h === 24) h = 0
  const localMs = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'))
  return localMs - date.getTime()
}

/**
 * Converts a local date+time (YYYY-MM-DD / HH:MM) in the given IANA timezone to a UTC ISO string.
 * Two iterations handle DST boundary edge cases.
 */
export function localToUtcIso(dateStr: string, timeStr: string, tz: string): string {
  if (tz === 'UTC') return `${dateStr}T${timeStr}:00.000Z`
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0)
  for (let i = 0; i < 2; i++) {
    utcMs = Date.UTC(y, mo - 1, d, h, mi, 0) - getTzOffsetMs(new Date(utcMs), tz)
  }
  return new Date(utcMs).toISOString()
}

/**
 * Returns a short "HH:MM UTC" preview string for display next to a time input.
 * Returns empty string if inputs are invalid.
 */
export function toUtcPreview(dateStr: string, timeStr: string, tz: string): string {
  if (
    !dateStr || !timeStr ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
    !/^\d{2}:\d{2}$/.test(timeStr)
  ) return ''
  if (tz === 'UTC') return ''
  const iso = localToUtcIso(dateStr, timeStr, tz)
  return iso.slice(11, 16) + ' UTC'
}

// IANA names top out around 30 chars; the cap only bounds what a crafted
// request can make Intl parse.
const MAX_TIMEZONE_LENGTH = 64

/**
 * Validates an untrusted IANA timezone name (e.g. from a request body) and
 * returns its canonical form, or null when Intl rejects it.
 */
export function normalizeTimeZone(tz: unknown): string | null {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > MAX_TIMEZONE_LENGTH) return null
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Constructing an Intl.DateTimeFormat is far costlier than calling it, and a
// single aggregate walk asks for the same zone once per trade.
const dayHourFormatters = new Map<string, Intl.DateTimeFormat>()

/**
 * Day-of-week (0 = Sunday) and hour (0-23) of an instant in the given IANA
 * timezone — the tz-explicit equivalent of `date.getDay()` / `date.getHours()`,
 * which read the runtime's local zone (the browser's, but UTC on the server).
 */
export function zonedDayHour(date: Date, tz: string): { day: number; hour: number } {
  let fmt = dayHourFormatters.get(tz)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    })
    dayHourFormatters.set(tz, fmt)
  }
  let day = -1
  let hour = -1
  for (const p of fmt.formatToParts(date)) {
    if (p.type === 'weekday') day = WEEKDAY_INDEX[p.value] ?? -1
    else if (p.type === 'hour') hour = Number(p.value) % 24
  }
  if (day === -1 || hour === -1 || Number.isNaN(hour)) {
    throw new Error(`zonedDayHour: could not resolve day/hour for ${date.toISOString()} in ${tz}`)
  }
  return { day, hour }
}
