// First-party cookie consent state.
//
// Lives in a first-party cookie (NOT in User.settings) because the banner must
// work for anonymous visitors on public landing pages — before any User row
// exists and before auth. The cookie is strictly-necessary itself (it records
// the user's own choice), so it is exempt from the consent it governs.
//
// Categories:
//   - necessary  — always on, not represented here (session, security, display prefs).
//   - analytics  — PostHog. Off until opt-in.
//   - monitoring — Sentry client (error reporting + on-error session replay). Off until opt-in.

export const CONSENT_COOKIE = 'ta_cookie_consent'
export const CONSENT_VERSION = 1

// 1 year, in seconds.
const MAX_AGE = 60 * 60 * 24 * 365

export interface ConsentState {
  /** Whether the user has made an explicit choice yet. */
  decided: boolean
  analytics: boolean
  monitoring: boolean
}

export const DEFAULT_CONSENT: ConsentState = {
  decided: false,
  analytics: false,
  monitoring: false,
}

interface ConsentCookie {
  v: number
  a: 0 | 1
  m: 0 | 1
  ts: number
}

/**
 * Parse a consent-cookie value (already extracted from `document.cookie` or
 * from a request cookie). Returns DEFAULT_CONSENT (undecided) when the value
 * is missing, malformed, or a stale schema version — a version bump therefore
 * re-prompts every user, which is the correct behaviour when the set of
 * trackers changes.
 *
 * Accepts both the raw encoded cookie and the decoded JSON Next.js hands back
 * from `cookies().get()`.
 */
export function parseConsentCookie(raw: string | null | undefined): ConsentState {
  if (!raw) return DEFAULT_CONSENT
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  try {
    const parsed = JSON.parse(decoded) as ConsentCookie
    if (parsed.v !== CONSENT_VERSION) return DEFAULT_CONSENT
    return {
      decided: true,
      analytics: parsed.a === 1,
      monitoring: parsed.m === 1,
    }
  } catch {
    return DEFAULT_CONSENT
  }
}

/**
 * Read the consent cookie on the client.
 */
export function readConsent(): ConsentState {
  if (typeof document === 'undefined') return DEFAULT_CONSENT
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=')
  return parseConsentCookie(raw)
}

/** Persist an explicit choice to the consent cookie (client-only). */
export function writeConsent(state: { analytics: boolean; monitoring: boolean }): void {
  if (typeof document === 'undefined') return
  const payload: ConsentCookie = {
    v: CONSENT_VERSION,
    a: state.analytics ? 1 : 0,
    m: state.monitoring ? 1 : 0,
    ts: Date.now(),
  }
  const value = encodeURIComponent(JSON.stringify(payload))
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`
}

/**
 * Read the monitoring flag synchronously from document.cookie, for use in
 * instrumentation-client.ts where the React context is not available and Sentry
 * must decide whether to initialise at module-load time.
 */
export function readMonitoringConsent(): boolean {
  return readConsent().monitoring
}
