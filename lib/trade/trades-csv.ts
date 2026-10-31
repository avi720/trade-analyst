export interface CsvTrade {
  ticker: string
  direction: string
  status: string
  source: string
  setupType: string | null
  tags: string[] | null
  openedAt: string
  closedAt: string | null
  avgEntryPrice: number
  avgExitPrice: number | null
  totalQuantityOpened: number
  totalQuantity: number
  stopPrice: number | null
  targetPrice: number | null
  actualR: number | null
  plannedR: number | null
  realizedPnl: number | null
  totalCommission: number | null
  result: string | null
  closeReason: string | null
  executionQuality: number | null
  emotionalState: string | null
  notes: string | null
  didRight: string | null
  wouldChange: string | null
}

const COLUMNS: [string, (t: CsvTrade) => string | number | null][] = [
  ['טיקר', t => t.ticker],
  ['כיוון', t => t.direction],
  ['סטטוס', t => t.status],
  ['מקור', t => t.source],
  ['סטאפ', t => t.setupType],
  ['תגיות', t => (t.tags ?? []).join('; ')],
  ['פתיחה', t => t.openedAt],
  ['סגירה', t => t.closedAt],
  ['מחיר כניסה ממוצע', t => t.avgEntryPrice],
  ['מחיר יציאה ממוצע', t => t.avgExitPrice],
  ['כמות שנפתחה', t => t.totalQuantityOpened],
  ['כמות פתוחה', t => t.totalQuantity],
  ['סטופ', t => t.stopPrice],
  ['יעד', t => t.targetPrice],
  ['R בפועל', t => t.actualR],
  ['R מתוכנן', t => t.plannedR],
  ['P&L', t => t.realizedPnl],
  ['עמלות', t => t.totalCommission],
  ['תוצאה', t => t.result],
  ['סיבת סגירה', t => t.closeReason],
  ['איכות ביצוע', t => t.executionQuality],
  ['מצב רגשי', t => t.emotionalState],
  ['הערות', t => t.notes],
  ['מה עשיתי נכון', t => t.didRight],
  ['מה הייתי משנה', t => t.wouldChange],
]

function cell(value: string | number | null): string {
  if (value === null) return ''
  if (typeof value === 'number') return String(value)
  // A leading formula character would execute when the file opens in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

// The BOM makes Excel read the Hebrew as UTF-8.
export function tradesToCsv(trades: CsvTrade[]): string {
  const rows = [
    COLUMNS.map(([header]) => cell(header)),
    ...trades.map(t => COLUMNS.map(([, read]) => cell(read(t)))),
  ]
  return '﻿' + rows.map(r => r.join(',')).join('\r\n') + '\r\n'
}
