const DEFAULT_HOST = 'https://us.i.posthog.com'

export type ServerEventProperties = Record<string, string | number | boolean>

export interface ServerEvent {
  distinctId: string
  event: string
  properties?: ServerEventProperties
  /** Stable id so PostHog drops a retried delivery of the same event. */
  uuid?: string
}

/**
 * Same gate as the browser SDK: a project key and a production runtime.
 * Dev and tests stay quiet. The key is the public project key already shipped
 * to the client (`NEXT_PUBLIC_POSTHOG_KEY`); no separate server secret.
 */
export function isServerAnalyticsEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NODE_ENV === 'production'
}

/**
 * Send one event as the given distinct id. Callers pass non-PII properties
 * only — this helper does not attach email, name, or person properties.
 * `$geoip_disable` keeps the Vercel region's IP off the person (the browser
 * events already carry the user's location).
 *
 * Uses the public capture API directly so the server path does not pull in
 * posthog-node (and the newer `@posthog/core` that would hoist over posthog-js).
 *
 * Never throws: a tracking failure must not fail the request that triggered it.
 */
export async function captureServerEvent(input: ServerEvent): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || process.env.NODE_ENV !== 'production') return

  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST).replace(/\/$/, '')
  const properties: ServerEventProperties = { ...input.properties, $geoip_disable: true }
  if (input.uuid) properties.$insert_id = input.uuid

  try {
    const res = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event: input.event,
        distinct_id: input.distinctId,
        properties,
      }),
    })
    if (!res.ok) {
      console.error('[analytics] server capture failed:', res.status)
    }
  } catch (err) {
    console.error('[analytics] server capture failed:', err instanceof Error ? err.message : err)
  }
}
