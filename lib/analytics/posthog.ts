'use client'

import posthog from 'posthog-js'

function posthogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY
}

function posthogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
}

function analyticsEnabled(): boolean {
  return !!posthogKey() && process.env.NODE_ENV === 'production'
}

interface QueuedEvent {
  event: FunnelEvent
  properties?: Record<string, unknown>
}

interface QueuedIdentify {
  userId: string
  traits?: Record<string, unknown>
}

// Events fired from a child effect can run before ConsentProvider's effect
// calls initPostHog. Hold them until init, then drop them on opt-out.
const MAX_QUEUED = 50
const queuedEvents: QueuedEvent[] = []
let queuedIdentify: QueuedIdentify | null = null

function flushQueuedAnalytics(): void {
  const identify = queuedIdentify
  queuedIdentify = null
  if (identify) posthog.identify(identify.userId, identify.traits)
  const events = queuedEvents.splice(0, queuedEvents.length)
  for (const item of events) posthog.capture(item.event, item.properties)
}

/** Drop anything captured before the user opted out, so a later opt-in does not replay it. */
export function discardQueuedEvents(): void {
  queuedEvents.length = 0
  queuedIdentify = null
}

/**
 * Initialise PostHog. Called ONLY after the user has granted analytics consent
 * (see components/consent/consent-provider.tsx) — never at module load, so no
 * PostHog cookie or network request happens before opt-in. Idempotent: the
 * `__loaded` guard makes repeat calls (e.g. re-render, consent re-grant) safe.
 *
 * Session recording is intentionally disabled at launch — financial-data app
 * with no masking config yet. See X2 in docs/in-progress/SECURITY-AUDIT-LAUNCH.md;
 * re-enable path is X23 (requires maskAllInputs + maskTextFn + sampling: 0.1 +
 * opt-out affordance + privacy-page disclosure).
 *
 * Autocapture is opt-in via [data-analytics] attribute — no click event is sent
 * unless the target element (or an ancestor) explicitly declares data-analytics.
 * This keeps trackEvent() funnel calls working while preventing accidental
 * capture of ticker symbols, dollar amounts, or chat text via automatic click
 * tracking.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined' || !analyticsEnabled() || posthog.__loaded) return
  posthog.init(posthogKey()!, {
    api_host: posthogHost(),
    capture_pageview: 'history_change',
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: { css_selector_allowlist: ['[data-analytics]'] },
    disable_session_recording: true,
    // Pin the two useful, non-PII product signals ON explicitly so they don't
    // depend on the remote project config staying enabled:
    //   - web_vitals: Core Web Vitals ($web_vitals events) for perf monitoring.
    //   - dead clicks: clicks that produce no page change (frustration signal).
    // Surveys are turned OFF — we don't run in-app surveys, so there's no reason
    // to ship surveys.js to every consenting visitor.
    capture_performance: { web_vitals: true },
    capture_dead_clicks: true,
    disable_surveys: true,
  })
  flushQueuedAnalytics()
}

export type FunnelEvent =
  // Signup page mount. The top of the funnel for visitors who open /signup.
  | 'signup_viewed'
  // Email signup: `signup_submitted` fires when the user submits step 1 (before the Supabase
  // call) or clicks Google on /signup. `signup_failed` when any step rejects. `signup_started`
  // fires only after the account exists, so submitted vs started is the account-creation drop.
  | 'signup_submitted'
  | 'signup_failed'
  | 'signup_started'
  | 'email_confirmed'
  // Profile wizard finished — the signup-completed step (audit event of the same moment
  // is `signup_completed`).
  | 'profile_completed'
  | 'login_succeeded'
  | 'login_failed'
  // Empty /research state: the user has an account and no closed trades yet.
  | 'onboarding_viewed'
  // User committed to a trade-entry path. `source`: manual | excel | ai_import.
  | 'import_started'
  // IBKR connection saved. `source`: ibkr.
  | 'broker_connected'
  // Legacy client signal. Fires on every successful manual/excel/AI import, not only
  // the first, and never for IBKR. The funnel conversion is the server event
  // `first_trade_created` (not in this union — it is not sent from the browser).
  | 'first_trade_imported'
  // Google OAuth + auth-failure telemetry. Before these existed, a Google signup that lost
  // its PKCE exchange left no trace anywhere — see docs/in-progress/AUTH-HARDENING-GEO-GATE.md.
  | 'google_signin_clicked'
  | 'google_signin_failed'
  | 'oauth_callback_failed'
  | 'ai_import_uploaded'
  | 'ai_import_mapped'
  | 'ai_import_confirmed'
  | 'ai_import_failed'

export function trackEvent(event: FunnelEvent, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !analyticsEnabled()) return
  if (!posthog.__loaded) {
    if (queuedEvents.length < MAX_QUEUED) queuedEvents.push({ event, properties })
    return
  }
  posthog.capture(event, properties)
}

/**
 * Fire `event` at most once per browser tab session. Used for steps that a
 * remount would otherwise double-count (email confirmed, empty-state onboarding).
 */
export function trackOncePerSession(
  event: FunnelEvent,
  storageKey: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  try {
    const fullKey = `ta_evt:${storageKey}`
    if (sessionStorage.getItem(fullKey)) return
    sessionStorage.setItem(fullKey, '1')
  } catch {
    // Storage blocked — still fire. A duplicate in that browser is rarer than a miss.
  }
  trackEvent(event, properties)
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !analyticsEnabled()) return
  if (!posthog.__loaded) {
    queuedIdentify = { userId, traits }
    return
  }
  posthog.identify(userId, traits)
}

export function resetUser(): void {
  discardQueuedEvents()
  if (typeof window === 'undefined' || !analyticsEnabled() || !posthog.__loaded) return
  posthog.reset()
}
