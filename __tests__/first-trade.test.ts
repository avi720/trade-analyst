import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConsentState } from '@/lib/consent/consent'

const readRequestConsent = vi.hoisted(() => vi.fn(async (): Promise<ConsentState | null> => null))
const captureServerEvent = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('@/lib/analytics/request-consent', () => ({ readRequestConsent }))
vi.mock('@/lib/analytics/posthog-server', () => ({ captureServerEvent }))

import {
  FIRST_TRADE_EVENT,
  firstTradeEventUuid,
  isFirstTradeEventUuid,
  observeFirstTrade,
  resetFirstTradeTrackingForTests,
  shouldEmitFirstTrade,
  trackFirstTradeCreated,
  type FirstTradeSource,
  type ServerCapture,
} from '@/lib/analytics/first-trade'

const USER = '11111111-1111-4111-8111-111111111111'

function decision(overrides: Partial<Parameters<typeof shouldEmitFirstTrade>[0]> = {}) {
  return {
    priorTradeCount: 0,
    openedTradeCount: 1,
    tradeCountAfter: 1,
    analyticsOptIn: true,
    ...overrides,
  }
}

function trackInput(source: FirstTradeSource = 'manual') {
  return {
    userId: USER,
    source,
    ...decision(),
  }
}

describe('shouldEmitFirstTrade', () => {
  it('emits when this write created every trade the user has', () => {
    expect(shouldEmitFirstTrade(decision())).toBe(true)
    expect(shouldEmitFirstTrade(decision({ openedTradeCount: 4, tradeCountAfter: 4 }))).toBe(true)
  })

  it('does not emit when the user already had trades', () => {
    expect(shouldEmitFirstTrade(decision({ priorTradeCount: 1, tradeCountAfter: 2 }))).toBe(false)
    expect(shouldEmitFirstTrade(decision({ priorTradeCount: 3, openedTradeCount: 1, tradeCountAfter: 4 }))).toBe(false)
  })

  it('does not emit when the batch opened nothing', () => {
    expect(shouldEmitFirstTrade(decision({ openedTradeCount: 0, tradeCountAfter: 0 }))).toBe(false)
  })

  it('suppresses both sides of a concurrent insert', () => {
    expect(shouldEmitFirstTrade(decision({ openedTradeCount: 1, tradeCountAfter: 2 }))).toBe(false)
  })

  it('does not emit without analytics opt-in', () => {
    expect(shouldEmitFirstTrade(decision({ analyticsOptIn: false }))).toBe(false)
  })

  it('rejects non-integer counts', () => {
    expect(shouldEmitFirstTrade(decision({ priorTradeCount: 0.5 }))).toBe(false)
    expect(shouldEmitFirstTrade(decision({ openedTradeCount: -1, tradeCountAfter: -1 }))).toBe(false)
  })
})

describe('firstTradeEventUuid', () => {
  it('is a stable v4-shaped uuid per user', () => {
    const uuid = firstTradeEventUuid(USER)
    expect(uuid).toBe(firstTradeEventUuid(USER))
    expect(isFirstTradeEventUuid(uuid)).toBe(true)
    expect(firstTradeEventUuid('other-user')).not.toBe(uuid)
  })
})

describe('trackFirstTradeCreated', () => {
  beforeEach(() => {
    resetFirstTradeTrackingForTests()
  })

  it('captures once with source and the user id, and no other properties', async () => {
    const capture = vi.fn<ServerCapture>(async () => undefined)
    const emitted = await trackFirstTradeCreated(trackInput('excel'), capture)

    expect(emitted).toBe(true)
    expect(capture).toHaveBeenCalledOnce()
    expect(capture).toHaveBeenCalledWith({
      distinctId: USER,
      event: FIRST_TRADE_EVENT,
      properties: { source: 'excel' },
      uuid: firstTradeEventUuid(USER),
    })
    const payload = capture.mock.calls[0][0]
    expect(Object.keys(payload.properties ?? {}).sort()).toEqual(['source'])
    expect(JSON.stringify(payload)).not.toContain('@')
  })

  it('does not capture a later write for the same user', async () => {
    const capture = vi.fn<ServerCapture>(async () => undefined)
    await trackFirstTradeCreated(trackInput('manual'), capture)
    const again = await trackFirstTradeCreated(
      { ...trackInput('ibkr'), priorTradeCount: 1, openedTradeCount: 2, tradeCountAfter: 3 },
      capture,
    )
    expect(again).toBe(false)
    expect(capture).toHaveBeenCalledOnce()
  })

  it('fires only one capture when two callers race in the same process', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const capture = vi.fn<ServerCapture>(async () => {
      await gate
    })
    const first = trackFirstTradeCreated(trackInput('ai_import'), capture)
    const second = trackFirstTradeCreated(trackInput('ai_import'), capture)
    release()
    const [a, b] = await Promise.all([first, second])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(capture).toHaveBeenCalledOnce()
  })

  it('allows a retry when the capture throws, and does not throw itself', async () => {
    const capture = vi.fn<ServerCapture>()
      .mockRejectedValueOnce(new Error('posthog down'))
      .mockResolvedValueOnce(undefined)
    await expect(trackFirstTradeCreated(trackInput('manual'), capture)).resolves.toBe(false)
    await expect(trackFirstTradeCreated(trackInput('manual'), capture)).resolves.toBe(true)
    expect(capture).toHaveBeenCalledTimes(2)
  })
})

function fakeAdmin(counts: number[], settings: unknown = { analyticsOptIn: true }) {
  let n = 0
  return {
    from(table: string) {
      if (table === 'User') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { settings }, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: async () => {
            const count = counts[n] ?? counts[counts.length - 1] ?? 0
            n += 1
            return { count, error: null }
          },
        }),
      }
    },
  }
}

describe('observeFirstTrade', () => {
  beforeEach(() => {
    resetFirstTradeTrackingForTests()
    readRequestConsent.mockReset()
    readRequestConsent.mockResolvedValue(null)
    captureServerEvent.mockReset()
    captureServerEvent.mockResolvedValue(undefined)
  })

  it('emits from the stored opt-in when the request has no consent cookie', async () => {
    await observeFirstTrade({
      // The fake only implements the two chains this helper calls.
      admin: fakeAdmin([1]) as never,
      userId: USER,
      source: 'ibkr',
      priorTradeCount: 0,
      openedTradeIds: ['trade-1', 'trade-1'],
    })
    expect(captureServerEvent).toHaveBeenCalledOnce()
    expect(captureServerEvent).toHaveBeenCalledWith({
      distinctId: USER,
      event: FIRST_TRADE_EVENT,
      properties: { source: 'ibkr' },
      uuid: firstTradeEventUuid(USER),
    })
  })

  it('does not emit when a concurrent writer also inserted trades', async () => {
    await observeFirstTrade({
      admin: fakeAdmin([2]) as never,
      userId: USER,
      source: 'manual',
      priorTradeCount: 0,
      openedTradeIds: ['trade-1'],
    })
    expect(captureServerEvent).not.toHaveBeenCalled()
  })

  it('does not emit for a user who already had a trade', async () => {
    await observeFirstTrade({
      admin: fakeAdmin([5]) as never,
      userId: USER,
      source: 'excel',
      priorTradeCount: 4,
      openedTradeIds: ['trade-9'],
    })
    expect(captureServerEvent).not.toHaveBeenCalled()
  })

  it('prefers an explicit cookie opt-out over a stored opt-in', async () => {
    readRequestConsent.mockResolvedValue({ decided: true, analytics: false, monitoring: false })
    await observeFirstTrade({
      admin: fakeAdmin([1], { analyticsOptIn: true }) as never,
      userId: USER,
      source: 'manual',
      priorTradeCount: 0,
      openedTradeIds: ['trade-1'],
    })
    expect(captureServerEvent).not.toHaveBeenCalled()
  })

  it('emits when the request cookie opted in even if the row flag is still false', async () => {
    readRequestConsent.mockResolvedValue({ decided: true, analytics: true, monitoring: false })
    await observeFirstTrade({
      admin: fakeAdmin([1], { analyticsOptIn: false }) as never,
      userId: USER,
      source: 'ai_import',
      priorTradeCount: 0,
      openedTradeIds: ['trade-1'],
    })
    expect(captureServerEvent).toHaveBeenCalledOnce()
    expect(captureServerEvent).toHaveBeenCalledWith(expect.objectContaining({
      properties: { source: 'ai_import' },
    }))
  })

  it('swallows a settings read failure', async () => {
    const admin = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: 'db down' } }),
            }),
          }),
        }
      },
    }
    await expect(observeFirstTrade({
      admin: admin as never,
      userId: USER,
      source: 'manual',
      priorTradeCount: 0,
      openedTradeIds: ['trade-1'],
    })).resolves.toBeUndefined()
    expect(captureServerEvent).not.toHaveBeenCalled()
  })
})
