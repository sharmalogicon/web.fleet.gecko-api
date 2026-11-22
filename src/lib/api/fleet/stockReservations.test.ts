import { describe, expect, it } from 'vitest'
import { activeFor, reserveRequest } from './stockReservations'

describe('stock reservation (prompt 19 §B)', () => {
  it('qty empty = what the line still needs (null); WO part vs goods-request line', () => {
    expect(reserveRequest({ kind: 'WO_PART', lineId: 'p1' }, 'w1', '')).toEqual({ request: { warehouseId: 'w1', woPartId: 'p1', goodsRequestLineId: null, qty: null }, error: null })
    expect(reserveRequest({ kind: 'GOODS_REQUEST', lineId: 'g1' }, 'w1', ' 2.5 ').request).toEqual({ warehouseId: 'w1', woPartId: null, goodsRequestLineId: 'g1', qty: 2.5 })
  })
  it('needs a store and a positive qty', () => {
    expect(reserveRequest({ kind: 'WO_PART', lineId: 'p1' }, '', '')).toEqual({ request: null, error: 'docs.rule.store' })
    expect(reserveRequest({ kind: 'WO_PART', lineId: 'p1' }, 'w1', '0').error).toBe('reserve.rule.qty')
    expect(reserveRequest({ kind: 'WO_PART', lineId: 'p1' }, 'w1', 'x').error).toBe('reserve.rule.qty')
  })
  it('finds the line\'s active reservation', () => {
    const rows = [
      { stockReservationId: 'r1', woPartId: 'p1', goodsRequestLineId: null, status: 'RELEASED' },
      { stockReservationId: 'r2', woPartId: 'p1', goodsRequestLineId: null, status: 'ACTIVE' },
      { stockReservationId: 'r3', woPartId: null, goodsRequestLineId: 'g1', status: 'ACTIVE' },
    ] as never
    expect(activeFor(rows, { kind: 'WO_PART', lineId: 'p1' })?.stockReservationId).toBe('r2')
    expect(activeFor(rows, { kind: 'GOODS_REQUEST', lineId: 'g1' })?.stockReservationId).toBe('r3')
    expect(activeFor(rows, { kind: 'WO_PART', lineId: 'p9' })).toBeUndefined()
  })
})
