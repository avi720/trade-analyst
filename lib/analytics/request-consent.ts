import { CONSENT_COOKIE, parseConsentCookie, type ConsentState } from '@/lib/consent/consent'

/**
 * The analytics consent cookie on the current request, or null when there is
 * no cookie or no request scope (the caller then falls back to the user row).
 * `null` is not the same as "opted out" — opted out is a parsed cookie with
 * `decided: true` and `analytics: false`.
 */
export async function readRequestConsent(): Promise<ConsentState | null> {
  try {
    const { cookies } = await import('next/headers')
    const jar = await cookies()
    const raw = jar.get(CONSENT_COOKIE)?.value
    if (!raw) return null
    return parseConsentCookie(raw)
  } catch {
    return null
  }
}
