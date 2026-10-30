'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { identifyUser } from '@/lib/analytics/posthog'
import { syncAnalyticsConsent } from '@/lib/analytics/sync-consent'
import { useConsent } from '@/components/consent/consent-provider'

/**
 * Keeps the PostHog person identity in sync with the Supabase session, on every auth path.
 *
 * Why this exists: identifyUser() used to be called only from the email+password signup
 * wizard, so Google OAuth sign-ins were never identified — their events landed on an
 * anonymous distinct-id that no person lookup could find. That is why the PostHog
 * investigation into swbwywsy@gmail.com (Google signup, 2026-07-15) came back empty: not
 * "never visited", but "never identified".
 *
 * Mounted once in the ROOT layout rather than the dashboard layout — deliberately, because
 * the users we are blind to are exactly the ones who never reach the dashboard.
 *
 * No-ops without analytics consent: identifyUser() itself checks posthog.__loaded, which is
 * only true after ConsentProvider has initialised PostHog on opt-in.
 */
export function AnalyticsIdentity() {
  const { analytics, decided } = useConsent()

  useEffect(() => {
    if (!decided) return

    let active = true
    // One settings write per consent change, not per token refresh.
    let consentSynced = false

    // Identify only when the distinct-id has actually drifted from the user id, so repeat
    // renders and token refreshes don't emit redundant $identify events.
    const syncIdentity = (userId: string | undefined) => {
      if (!active || !analytics || !userId) return
      if (!posthog.__loaded) return
      if (posthog.get_distinct_id() === userId) return
      identifyUser(userId)
    }

    const syncConsent = (userId: string | undefined) => {
      if (!active || !userId || consentSynced) return
      consentSynced = true
      syncAnalyticsConsent(analytics)
    }

    const run = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      syncConsent(user?.id)
      syncIdentity(user?.id)

      // Opt-out has nothing to subscribe for. Opt-in still catches the OAuth return,
      // where the session lands after this effect first ran.
      if (!analytics) return undefined

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        syncConsent(session?.user?.id)
        syncIdentity(session?.user?.id)
      })
      return subscription
    }

    const subscriptionPromise = run()

    return () => {
      active = false
      void subscriptionPromise.then((sub) => sub?.unsubscribe())
    }
  }, [analytics, decided])

  return null
}
