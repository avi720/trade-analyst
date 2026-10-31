/** Mirror the analytics cookie onto the signed-in user's row. Failures are ignored. */
export function syncAnalyticsConsent(analytics: boolean): void {
  if (typeof window === 'undefined') return
  void fetch('/api/analytics/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analytics }),
  }).catch(() => {})
}
