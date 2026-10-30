import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ph = vi.hoisted(() => ({
  loaded: false,
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  init: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: {
    get __loaded() {
      return ph.loaded
    },
    init: (...args: unknown[]) => {
      ph.loaded = true
      ph.init(...args)
    },
    capture: ph.capture,
    identify: ph.identify,
    reset: ph.reset,
  },
}))

import { discardQueuedEvents, identifyUser, initPostHog, trackEvent } from '@/lib/analytics/posthog'

describe('client analytics queue', () => {
  beforeEach(() => {
    ph.loaded = false
    ph.capture.mockClear()
    ph.identify.mockClear()
    ph.reset.mockClear()
    ph.init.mockClear()
    discardQueuedEvents()
    vi.stubGlobal('window', {})
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('holds events fired before init and sends them after, identify first', () => {
    identifyUser('user-1')
    trackEvent('signup_viewed')
    trackEvent('signup_submitted', { method: 'email' })
    expect(ph.capture).not.toHaveBeenCalled()
    expect(ph.init).not.toHaveBeenCalled()

    initPostHog()

    expect(ph.identify).toHaveBeenCalledWith('user-1', undefined)
    expect(ph.capture).toHaveBeenNthCalledWith(1, 'signup_viewed', undefined)
    expect(ph.capture).toHaveBeenNthCalledWith(2, 'signup_submitted', { method: 'email' })
    expect(ph.identify.mock.invocationCallOrder[0]).toBeLessThan(ph.capture.mock.invocationCallOrder[0])
  })

  it('drops the queue on opt-out so a later init does not replay it', () => {
    trackEvent('signup_viewed')
    discardQueuedEvents()
    initPostHog()
    expect(ph.capture).not.toHaveBeenCalled()
  })

  it('does not send when analytics is disabled', () => {
    vi.stubEnv('NODE_ENV', 'test')
    trackEvent('signup_viewed')
    initPostHog()
    expect(ph.init).not.toHaveBeenCalled()
    expect(ph.capture).not.toHaveBeenCalled()
  })
})
