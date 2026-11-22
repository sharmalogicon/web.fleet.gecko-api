import { describe, expect, it } from 'vitest'
import { toCostCorrections } from './costAdjustments'

const row = (id: string, postedAt: string, p: Record<string, unknown> = {}) => ({
  costAdjustmentId: id, itemCode: 'OIL', warehouseCode: 'MAIN', sourceDocNo: 'VIN-1', basisQty: 10, valueDelta: '50', qtyOnHand: 8,
  avgCostBefore: 100, avgCostAfter: '105', revaluedAmount: 40, expensedAmount: 10, reversesCostAdjustmentId: null, postedAt, ...p,
}) as never

describe('stock cost corrections (prompt 20 §B)', () => {
  it('newest first; a reversal and the row it reverses are both marked', () => {
    const rows = toCostCorrections([row('a1', '2026-11-20T01:00:00Z'), row('a2', '2026-11-21T01:00:00Z', { valueDelta: -50, reversesCostAdjustmentId: 'a1' }), row('a3', '2026-11-19T01:00:00Z')])
    expect(rows.map((r) => r.id)).toEqual(['a2', 'a1', 'a3'])
    expect(rows[0]).toMatchObject({ isReversal: true, isReversed: false, valueDelta: -50 })
    expect(rows[1]).toMatchObject({ isReversal: false, isReversed: true, valueDelta: 50, avgCostAfter: 105 })
    expect(rows[2]).toMatchObject({ isReversal: false, isReversed: false })
  })
})
