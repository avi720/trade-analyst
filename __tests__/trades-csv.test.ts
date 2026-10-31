import { describe, expect, it } from 'vitest'
import { tradesToCsv, type CsvTrade } from '@/lib/trade/trades-csv'

const trade: CsvTrade = {
  ticker: 'AAPL', direction: 'Long', status: 'Closed', source: 'manual', setupType: null,
  tags: ['a', 'b'], openedAt: '2026-01-01T10:00:00Z', closedAt: null, avgEntryPrice: 100,
  avgExitPrice: null, totalQuantityOpened: 10, totalQuantity: 0, stopPrice: null, targetPrice: null,
  actualR: -1.5, plannedR: null, realizedPnl: -50, totalCommission: null, result: 'Loss',
  closeReason: null, executionQuality: null, emotionalState: null, notes: null, didRight: null,
  wouldChange: null,
}

const dataRow = (t: CsvTrade) => tradesToCsv([t]).split('\r\n')[1]

describe('tradesToCsv', () => {
  it('starts with a BOM and a Hebrew header row', () => {
    expect(tradesToCsv([])).toMatch(/^﻿טיקר,כיוון,/)
  })

  it('keeps negative numbers numeric and joins tags', () => {
    const row = dataRow(trade)
    expect(row).toContain('a; b')
    expect(row).toContain(',-1.5,')
    expect(row).toContain(',-50,')
  })

  it('quotes commas, quotes and newlines', () => {
    expect(dataRow({ ...trade, notes: 'a,"b"' })).toContain('"a,""b"""')
    expect(tradesToCsv([{ ...trade, notes: 'a\nb' }])).toContain('"a\nb"')
  })

  it('neutralizes spreadsheet formulas in text', () => {
    expect(dataRow({ ...trade, notes: '=HYPERLINK("x")' })).toContain(`"'=HYPERLINK(""x"")"`)
    expect(dataRow({ ...trade, notes: '-cmd' })).toContain(`'-cmd`)
  })
})
