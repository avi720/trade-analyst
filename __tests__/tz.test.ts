import { describe, it, expect } from 'vitest'
import { localToUtcIso, toUtcPreview, normalizeTimeZone, zonedDayHour, toZonedIso } from '../lib/trade/tz'

describe('localToUtcIso', () => {
  it('UTC passthrough — no offset applied', () => {
    const result = localToUtcIso('2026-05-24', '16:30', 'UTC')
    expect(result).toBe('2026-05-24T16:30:00.000Z')
  })

  it('Israel summer (IDT = UTC+3): 16:30 local → 13:30 UTC', () => {
    // IDT is active from late March to late October
    const result = localToUtcIso('2026-05-24', '16:30', 'Asia/Jerusalem')
    expect(result.slice(11, 16)).toBe('13:30')
  })

  it('Israel winter (IST = UTC+2): 16:30 local → 14:30 UTC', () => {
    // IST is active from late October to late March
    const result = localToUtcIso('2026-01-15', '16:30', 'Asia/Jerusalem')
    expect(result.slice(11, 16)).toBe('14:30')
  })

  it('New York summer (EDT = UTC-4): 09:30 local → 13:30 UTC', () => {
    const result = localToUtcIso('2026-05-24', '09:30', 'America/New_York')
    expect(result.slice(11, 16)).toBe('13:30')
  })

  it('New York winter (EST = UTC-5): 09:30 local → 14:30 UTC', () => {
    const result = localToUtcIso('2026-01-15', '09:30', 'America/New_York')
    expect(result.slice(11, 16)).toBe('14:30')
  })

  it('returns valid ISO string format', () => {
    const result = localToUtcIso('2026-05-24', '10:00', 'Asia/Jerusalem')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('toUtcPreview', () => {
  it('returns empty string for UTC timezone', () => {
    expect(toUtcPreview('2026-05-24', '16:30', 'UTC')).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(toUtcPreview('invalid', '16:30', 'Asia/Jerusalem')).toBe('')
  })

  it('returns empty string for invalid time', () => {
    expect(toUtcPreview('2026-05-24', '', 'Asia/Jerusalem')).toBe('')
  })

  it('returns HH:MM UTC for Israel summer', () => {
    const preview = toUtcPreview('2026-05-24', '16:30', 'Asia/Jerusalem')
    expect(preview).toBe('13:30 UTC')
  })

  it('returns HH:MM UTC for Israel winter', () => {
    const preview = toUtcPreview('2026-01-15', '16:30', 'Asia/Jerusalem')
    expect(preview).toBe('14:30 UTC')
  })
})

describe('normalizeTimeZone', () => {
  it('accepts valid IANA names', () => {
    expect(normalizeTimeZone('Asia/Jerusalem')).toBe('Asia/Jerusalem')
    expect(normalizeTimeZone('UTC')).toBe('UTC')
    expect(normalizeTimeZone('America/New_York')).toBe('America/New_York')
  })

  it('returns the canonical casing', () => {
    expect(normalizeTimeZone('asia/jerusalem')).toBe('Asia/Jerusalem')
  })

  it('rejects unknown names, non-strings, empty and oversized input', () => {
    expect(normalizeTimeZone('Mars/Olympus_Mons')).toBeNull()
    expect(normalizeTimeZone(undefined)).toBeNull()
    expect(normalizeTimeZone(null)).toBeNull()
    expect(normalizeTimeZone(3)).toBeNull()
    expect(normalizeTimeZone({})).toBeNull()
    expect(normalizeTimeZone('')).toBeNull()
    expect(normalizeTimeZone('A'.repeat(65))).toBeNull()
  })
})

describe('zonedDayHour', () => {
  it('Saturday 23:30 UTC → Sunday 01:30 in Israel winter (IST, UTC+2)', () => {
    expect(zonedDayHour(new Date('2026-01-03T23:30:00Z'), 'Asia/Jerusalem')).toEqual({ day: 0, hour: 1 })
  })

  it('Saturday 23:30 UTC → Sunday 02:30 in Israel summer (IDT, UTC+3)', () => {
    expect(zonedDayHour(new Date('2026-06-06T23:30:00Z'), 'Asia/Jerusalem')).toEqual({ day: 0, hour: 2 })
  })

  it('UTC reads the instant as-is', () => {
    expect(zonedDayHour(new Date('2026-01-03T23:30:00Z'), 'UTC')).toEqual({ day: 6, hour: 23 })
  })

  it('midnight is hour 0, never 24', () => {
    expect(zonedDayHour(new Date('2026-01-04T00:00:00Z'), 'UTC')).toEqual({ day: 0, hour: 0 })
    expect(zonedDayHour(new Date('2026-01-03T22:00:00Z'), 'Asia/Jerusalem')).toEqual({ day: 0, hour: 0 })
  })

  it('matches getDay()/getHours() for the runtime zone across a full week of hours', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const start = Date.UTC(2026, 2, 22) // spans the late-March DST switches (IL + EU)
    for (let h = 0; h < 24 * 14; h++) {
      const date = new Date(start + h * 3_600_000)
      expect(zonedDayHour(date, zone)).toEqual({ day: date.getDay(), hour: date.getHours() })
    }
  })
})

describe('toZonedIso', () => {
  it('Israel winter (IST, +02:00): Saturday 23:30 UTC → Sunday 01:30 local', () => {
    expect(toZonedIso(new Date('2026-01-03T23:30:00Z'), 'Asia/Jerusalem')).toBe('2026-01-04T01:30:00+02:00')
  })

  it('Israel summer (IDT, +03:00)', () => {
    expect(toZonedIso(new Date('2026-06-06T23:30:00Z'), 'Asia/Jerusalem')).toBe('2026-06-07T02:30:00+03:00')
  })

  it('negative and half-hour offsets', () => {
    expect(toZonedIso(new Date('2026-01-03T23:30:00Z'), 'America/New_York')).toBe('2026-01-03T18:30:00-05:00')
    expect(toZonedIso(new Date('2026-01-03T23:30:00Z'), 'Asia/Kolkata')).toBe('2026-01-04T05:00:00+05:30')
  })

  it('UTC renders as +00:00', () => {
    expect(toZonedIso(new Date('2026-01-03T23:30:00Z'), 'UTC')).toBe('2026-01-03T23:30:00+00:00')
  })

  it('truncates to seconds without skewing the offset', () => {
    expect(toZonedIso(new Date('2026-01-03T23:30:59.999Z'), 'Asia/Jerusalem')).toBe('2026-01-04T01:30:59+02:00')
  })

  it('round-trips to the same instant across the March DST switch', () => {
    const start = Date.UTC(2026, 2, 26) // Israel springs forward on Fri 27 Mar 2026
    for (let m = 0; m < 3 * 24 * 60; m += 15) {
      const ms = start + m * 60_000
      expect(Date.parse(toZonedIso(new Date(ms), 'Asia/Jerusalem'))).toBe(ms)
    }
  })
})
