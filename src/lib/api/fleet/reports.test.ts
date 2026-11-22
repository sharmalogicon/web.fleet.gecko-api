import { describe, expect, it } from 'vitest'
import { formatCell, toReportQuery, visibleFields } from './reports'
import { changePct, daysLeft, toFleetStatus, toStatCards } from './dashboard'

describe('report cell formatter (prompt 16 §B)', () => {
  it('formats each column format', () => {
    expect(formatCell('2026-11-20', 'dd/MM/yyyy')).toBe('20/11/2026')
    // A date-time is shown in Thai time (UTC+7).
    expect(formatCell('2026-11-20T18:30:00Z', 'dd/MM/yyyy')).toBe('21/11/2026')
    expect(formatCell('2026-11-20T01:05:00Z', 'dd/MM/yyyy HH:mm')).toBe('20/11/2026 08:05')
    expect(formatCell(1234.5, '#,0.00')).toBe('1,234.50')
    expect(formatCell('1234.567', '#,0.##')).toBe('1,234.57')
    expect(formatCell(1200, '#,0.##')).toBe('1,200')
    expect(formatCell(1234.6, '#,0')).toBe('1,235')
    expect(formatCell(null, '#,0')).toBe('')
    expect(formatCell('TRK-01', null)).toBe('TRK-01')
    expect(formatCell(true, '')).toBe('Yes')
  })
})

describe('report params → fields + query', () => {
  it('shows only the fields of the params the report takes', () => {
    const f = visibleFields(['from', 'to', 'supplier', 'poNo', 'branchId'])
    expect([...f].sort()).toEqual(['dateRange', 'poNo', 'vendorName'])
    expect(visibleFields(['serialNo']).has('serialNo')).toBe(true)
    expect(visibleFields(undefined).size).toBe(0)
  })
  it('maps screen values to API names, drops "All" and params the report does not take', () => {
    const q = toReportQuery(
      { dateFrom: '2026-11-01', dateTo: '', equipmentCode: ' TRK ', equipmentCategory: 'truck', status: 'All', vendorName: 'PTT', poNo: 'PO-1', serialNo: 'S1' },
      ['from', 'to', 'equipmentCode', 'category', 'status', 'supplier'],
    )
    expect(q).toEqual({ from: '2026-11-01', equipmentCode: 'TRK', category: 'TRUCK', supplier: 'PTT' })
    expect(toReportQuery({ status: 'In Progress' }, ['status'])).toEqual({ status: 'IN_PROGRESS' })
  })
})

describe('dashboard (prompt 16 §A)', () => {
  it('stats → the six cards in order; change % only with a previous value', () => {
    const cards = toStatCards({ stats: [
      { key: 'FUEL_LITERS_MONTH', value: 4820, previousValue: 5080, unit: 'L' },
      { key: 'ACTIVE_WORK_ORDERS', value: 13, previousValue: 12, unit: null },
      { key: 'OPEN_PURCHASE_ORDERS', value: 23, previousValue: null, unit: null },
    ] } as never)
    expect(cards.map((c) => c.key)).toEqual(['ACTIVE_WORK_ORDERS', 'PENDING_PM', 'OPEN_PURCHASE_ORDERS', 'TOTAL_VEHICLES', 'OVERDUE_SERVICE', 'FUEL_LITERS_MONTH'])
    expect(cards[0]).toEqual({ key: 'ACTIVE_WORK_ORDERS', value: '13', change: 8.3 })
    expect(cards[1]).toEqual({ key: 'PENDING_PM', value: '0', change: undefined })
    expect(cards[2].change).toBeUndefined()
    expect(cards[5]).toEqual({ key: 'FUEL_LITERS_MONTH', value: '4,820 L', change: -5.1 })
    expect(changePct(5, 0)).toBeUndefined()
  })
  it('fleet status + days left', () => {
    expect(toFleetStatus({ fleetStatus: { ACTIVE: 18, IDLE: '6' } } as never)).toEqual([
      { key: 'ACTIVE', count: 18 }, { key: 'UNDER_MAINTENANCE', count: 0 }, { key: 'IDLE', count: 6 }, { key: 'OUT_OF_SERVICE', count: 0 },
    ])
    const today = new Date(2026, 10, 22)
    expect(daysLeft('2026-11-24', today)).toBe(2)
    expect(daysLeft('2026-11-20T00:00:00Z', today)).toBe(-2)
    expect(daysLeft(null, today)).toBeNull()
  })
})
