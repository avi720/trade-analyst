import type { ConsentState } from '@/lib/consent/consent'

function asRecord(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {}
  return { ...(settings as Record<string, unknown>) }
}

/** True only when the user row has an explicit analytics opt-in. Missing key is not opt-in. */
export function readAnalyticsOptIn(settings: unknown): boolean {
  return asRecord(settings).analyticsOptIn === true
}

/** Copy of settings with `analyticsOptIn` set, leaving every other key in place. */
export function withAnalyticsOptIn(settings: unknown, analyticsOptIn: boolean): Record<string, unknown> {
  return { ...asRecord(settings), analyticsOptIn }
}

/**
 * Apply a request consent cookie onto settings.
 * An explicit decision overwrites the stored flag. No cookie (or an undecided
 * one) leaves whatever was already stored.
 */
export function withAnalyticsOptInFromConsent(
  settings: unknown,
  consent: ConsentState | null,
): Record<string, unknown> {
  const base = asRecord(settings)
  if (consent?.decided) return { ...base, analyticsOptIn: consent.analytics }
  return base
}

/**
 * Server events follow the same opt-in as the browser SDK.
 * An explicit cookie decision wins (including opt-out). When this request has
 * no cookie — cron, or a background sync — the flag stored on the user row is
 * the answer.
 */
export function consentAllowsServerEvent(
  requestConsent: ConsentState | null,
  settingsOptIn: boolean,
): boolean {
  if (requestConsent?.decided) return requestConsent.analytics
  return settingsOptIn
}
