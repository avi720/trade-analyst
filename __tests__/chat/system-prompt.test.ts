import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { projectTrade, type ChatTrade } from '@/lib/chat/context-builder'
import { calcStats } from '@/lib/utils/calculations'

const context = '### היקף\nטריידים סגורים בהיקף: 42.'

describe('buildSystemPrompt — capability statement per mode', () => {
  it('always ends with the context block', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart' })
    expect(p.endsWith(context)).toBe(true)
    expect(p).toContain('הנתונים הנוכחיים:')
  })

  it('smart mode names the gated fields as a Pro capability, not as missing data', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart' })
    expect(p).toContain('קיימים במערכת')
    expect(p).toContain('זמין במצב "עומק"')
    // The failure this guards against: telling the user to re-enter data the
    // app already stores.
    expect(p).toContain('אל תבקש ממנו להזין את הנתונים מחדש')
  })

  it('smart mode is told not to silently drop the unanswerable half of a question', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart' })
    expect(p).toContain('אל תשמיט חלק מהשאלה בשקט')
  })

  it('full mode advertises the extra fields and keeps free text opt-in', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full' })
    expect(p).toContain('שעת הפתיחה')
    expect(p).toContain('queryTrades')
    expect(p).not.toContain('קיימים במערכת')
  })

  it('always carries the scope-honesty rules', () => {
    for (const mode of ['smart', 'full'] as const) {
      expect(buildSystemPrompt({ timeZone: 'UTC', context, mode })).toContain('אל תניח שראית את כל ההיסטוריה')
    }
  })
})

describe('buildSystemPrompt — tool section', () => {
  it('is omitted when no tools are registered', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full' })
    expect(p).not.toContain('עומדים לרשותך הכלים הבאים')
  })

  it('lists the registered tool names when tools are on', () => {
    const p = buildSystemPrompt({
      timeZone: 'UTC',
      context, mode: 'full', toolNames: ['queryTrades', 'getSetupBreakdown'],
    })
    expect(p).toContain('עומדים לרשותך הכלים הבאים: queryTrades, getSetupBreakdown.')
  })

  it('is omitted for an empty tool list', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full', toolNames: [] })
    expect(p).not.toContain('עומדים לרשותך הכלים הבאים')
  })
})

describe('buildSystemPrompt — P1-D web/tool exclusivity', () => {
  it('explains the trade-off when grounding is on', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full', webSearch: true })
    expect(p).toContain('יש לך גישה לחיפוש בגוגל')
    expect(p).toContain('אי אפשר גם לחפש באינטרנט וגם להריץ שאילתות מתקדמות')
    expect(p).toContain('אל תתעלם מחצי מהשאלה בשקט')
  })

  it('explains why the web is unavailable on a tool turn', () => {
    const p = buildSystemPrompt({
      timeZone: 'UTC',
      context, mode: 'full', toolNames: ['queryTrades'], webSearch: false,
    })
    expect(p).toContain('אין לך גישה לחיפוש בגוגל')
    expect(p).toContain('בהודעה נפרדת')
  })

  it('says nothing about the web for a Free-tier turn — no tools, no grounding', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart', webSearch: false })
    expect(p).not.toContain('חיפוש באינטרנט')
  })

  it('never claims both capabilities in the same turn', () => {
    const grounded = buildSystemPrompt({
      timeZone: 'UTC',
      context, mode: 'full', toolNames: ['queryTrades'], webSearch: true,
    })
    expect(grounded).toContain('יש לך גישה לחיפוש בגוגל')
    expect(grounded).not.toContain('אין לך גישה לחיפוש בגוגל')
  })
})

describe('buildSystemPrompt — answer wording (field names, signs)', () => {
  const trade: ChatTrade = {
    id: 't1', ticker: 'AAPL', direction: 'Long', setupType: 'פריצה', tags: [],
    openedAt: new Date('2026-03-02T14:30:00Z'), closedAt: new Date('2026-03-02T18:00:00Z'),
    actualR: 1.5, plannedR: 2.5, realizedPnl: 300, avgEntryPrice: 100, avgExitPrice: 103,
    stopPrice: 98, totalQuantityOpened: 100, result: 'Win', executionQuality: 8, emotionalState: 'רגוע',
  }

  it('forbids field names in answers, even in parentheses, in both modes', () => {
    for (const mode of ['smart', 'full'] as const) {
      const p = buildSystemPrompt({ timeZone: 'UTC', context, mode })
      expect(p).toContain('לעולם אל תכתוב בתשובה שם שדה מהנתונים')
      expect(p).toContain('גם לא בסוגריים')
    }
  })

  it('maps field names to the research dashboard labels', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full' })
    expect(p).toContain('- planDeviation: סטייה מהתוכנית')
    expect(p).toContain('- avgR: R ממוצע')
    expect(p).toContain('- actualR: R בפועל')
    expect(p).toContain('- plannedR: R מתוכנן')
    expect(p).toContain('- stopDiscipline: משמעת סטופ')
  })

  // Drift guard: the KPI baseline is serialized with its raw keys, so a new
  // TradeStats field without a label would leak straight into answers.
  it('labels every KPI-baseline key in both modes', () => {
    for (const mode of ['smart', 'full'] as const) {
      const p = buildSystemPrompt({ timeZone: 'UTC', context, mode })
      for (const key of Object.keys(calcStats([]))) {
        expect(p, `${mode}: ${key}`).toMatch(new RegExp(`^- ${key}: \\S`, 'm'))
      }
    }
  })

  it('labels every row field the mode can see, and only those', () => {
    for (const mode of ['smart', 'full'] as const) {
      const p = buildSystemPrompt({ timeZone: 'UTC', context, mode })
      for (const key of Object.keys(projectTrade(trade, mode, 'UTC'))) {
        expect(p, `${mode}: ${key}`).toMatch(new RegExp(`^- ${key}: \\S`, 'm'))
      }
    }
    const full = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'full' })
    for (const key of ['notes', 'didRight', 'wouldChange']) {
      expect(full).toMatch(new RegExp(`^- ${key}: \\S`, 'm'))
    }
    // Smart must not be handed labels for fields its capability section withholds.
    const smart = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart' })
    for (const key of ['openedAt', 'plannedR', 'executionQuality', 'emotionalState', 'notes']) {
      expect(smart).not.toMatch(new RegExp(`^- ${key}:`, 'm'))
    }
  })

  it('requires the sign before the number and names the trailing-minus form as wrong', () => {
    for (const mode of ['smart', 'full'] as const) {
      const p = buildSystemPrompt({ timeZone: 'UTC', context, mode })
      expect(p).toContain('הסימן לפניו: -0.74R, +1.20R, -$350.00')
      expect(p).toContain('לעולם לא 0.74R-')
    }
  })

  it('tells the model win rate is a fraction to show as a percentage', () => {
    const p = buildSystemPrompt({ timeZone: 'UTC', context, mode: 'smart' })
    expect(p).toContain('0.56 → 56%')
  })
})

describe('buildSystemPrompt — timezone', () => {
  it('names the user zone and says timestamps are already local', () => {
    for (const mode of ['smart', 'full'] as const) {
      const p = buildSystemPrompt({ timeZone: 'Asia/Jerusalem', context, mode })
      expect(p).toContain('אזור הזמן של המשתמש הוא Asia/Jerusalem')
      expect(p).toContain('בלי להמיר ל-UTC')
    }
  })

  it('keeps the context block last', () => {
    const p = buildSystemPrompt({ timeZone: 'Asia/Jerusalem', context, mode: 'full', toolNames: ['queryTrades'] })
    expect(p.endsWith(context)).toBe(true)
  })
})
