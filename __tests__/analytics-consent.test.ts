import { describe, expect, it } from 'vitest'
import {
  consentAllowsServerEvent,
  readAnalyticsOptIn,
  withAnalyticsOptIn,
  withAnalyticsOptInFromConsent,
} from '@/lib/analytics/analytics-opt-in'
import { parseConsentCookie } from '@/lib/consent/consent'
import { isFreshAccount, signupMethodFromProvider } from '@/lib/analytics/signup-method'

const optedIn = encodeURIComponent(JSON.stringify({ v: 1, a: 1, m: 0, ts: 1 }))
const optedOut = JSON.stringify({ v: 1, a: 0, m: 1, ts: 1 })

describe('parseConsentCookie', () => {
  it('reads an encoded cookie and a decoded one', () => {
    expect(parseConsentCookie(optedIn)).toEqual({ decided: true, analytics: true, monitoring: false })
    expect(parseConsentCookie(optedOut)).toEqual({ decided: true, analytics: false, monitoring: true })
  })

  it('treats a missing, stale, or broken cookie as undecided', () => {
    expect(parseConsentCookie(null).decided).toBe(false)
    expect(parseConsentCookie(undefined).decided).toBe(false)
    expect(parseConsentCookie('not-json').decided).toBe(false)
    expect(parseConsentCookie(JSON.stringify({ v: 99, a: 1, m: 1, ts: 1 })).decided).toBe(false)
  })
})

describe('analytics opt-in on the user row', () => {
  it('preserves other settings keys', () => {
    const next = withAnalyticsOptIn({ display: { currency: 'USD' } }, true)
    expect(next).toEqual({ display: { currency: 'USD' }, analyticsOptIn: true })
    expect(readAnalyticsOptIn(next)).toBe(true)
    expect(readAnalyticsOptIn({})).toBe(false)
    expect(readAnalyticsOptIn(null)).toBe(false)
  })

  it('writes the flag only from an explicit cookie decision', () => {
    const existing = { display: { currency: 'ILS' }, analyticsOptIn: true }
    expect(withAnalyticsOptInFromConsent(existing, null)).toEqual(existing)
    expect(withAnalyticsOptInFromConsent(existing, { decided: false, analytics: false, monitoring: false })).toEqual(existing)
    expect(withAnalyticsOptInFromConsent(existing, { decided: true, analytics: false, monitoring: false })).toEqual({
      display: { currency: 'ILS' },
      analyticsOptIn: false,
    })
  })
})

describe('consentAllowsServerEvent', () => {
  it('lets an explicit cookie decision win over the stored flag', () => {
    expect(consentAllowsServerEvent({ decided: true, analytics: true, monitoring: false }, false)).toBe(true)
    expect(consentAllowsServerEvent({ decided: true, analytics: false, monitoring: true }, true)).toBe(false)
  })

  it('uses the stored flag when the request has no decision', () => {
    expect(consentAllowsServerEvent(null, true)).toBe(true)
    expect(consentAllowsServerEvent(null, false)).toBe(false)
    expect(consentAllowsServerEvent({ decided: false, analytics: false, monitoring: false }, true)).toBe(true)
  })
})

describe('signup method helpers', () => {
  const now = Date.parse('2026-10-30T12:00:00.000Z')

  it('treats an account created in the last five minutes as a signup', () => {
    expect(isFreshAccount('2026-10-30T11:56:00.000Z', now)).toBe(true)
    expect(isFreshAccount('2026-10-30T11:54:00.000Z', now)).toBe(false)
    expect(isFreshAccount(undefined, now)).toBe(false)
    expect(isFreshAccount('nope', now)).toBe(false)
  })

  it('maps the auth provider onto the funnel method', () => {
    expect(signupMethodFromProvider('google')).toBe('google')
    expect(signupMethodFromProvider('email')).toBe('email')
    expect(signupMethodFromProvider(undefined)).toBe('email')
  })
})
