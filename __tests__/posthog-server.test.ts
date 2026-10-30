import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureServerEvent, isServerAnalyticsEnabled } from '@/lib/analytics/posthog-server'

describe('captureServerEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com')
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is disabled without a production key', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(isServerAnalyticsEnabled()).toBe(false)
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    expect(isServerAnalyticsEnabled()).toBe(false)
  })

  it('does not call PostHog outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    await captureServerEvent({ distinctId: 'user-1', event: 'first_trade_created', properties: { source: 'manual' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts the event with the user id, source, and no other person fields', async () => {
    await captureServerEvent({
      distinctId: 'user-1',
      event: 'first_trade_created',
      properties: { source: 'manual' },
      uuid: '11111111-1111-4111-8111-111111111111',
    })
    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://us.i.posthog.com/capture/')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body))
    expect(body).toEqual({
      api_key: 'phc_test',
      event: 'first_trade_created',
      distinct_id: 'user-1',
      properties: {
        source: 'manual',
        $geoip_disable: true,
        $insert_id: '11111111-1111-4111-8111-111111111111',
      },
    })
    expect(JSON.stringify(body)).not.toContain('@')
  })

  it('does not throw when the request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))
    await expect(captureServerEvent({
      distinctId: 'user-1',
      event: 'first_trade_created',
      properties: { source: 'ibkr' },
    })).resolves.toBeUndefined()
  })
})
