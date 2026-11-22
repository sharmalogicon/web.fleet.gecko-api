import { describe, expect, it } from 'vitest'
import { poActions, receiptLineFromPo, signedQty, viewGoodsRequestStatus, viewPoStatus } from './documents'
import { stockSnapshot } from './items'

describe('goods request status (prompt 11 §B)', () => {
  it('maps API → screen', () => {
    for (const s of ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIAL']) expect(viewGoodsRequestStatus(s)).toBe('OPEN')
    expect(viewGoodsRequestStatus('FULFILLED')).toBe('FULFILLED')
    expect(viewGoodsRequestStatus('REJECTED')).toBe('CANCELLED')
    expect(viewGoodsRequestStatus('CANCELLED')).toBe('CANCELLED')
  })
})

describe('purchase order status (prompt 11 §C)', () => {
  it('maps API → screen', () => {
    expect(viewPoStatus('PENDING_APPROVAL')).toBe('PENDING')
    expect(viewPoStatus('PARTIALLY_RECEIVED')).toBe('PARTIAL')
    expect(viewPoStatus('REJECTED')).toBe('CANCELLED')
    expect(viewPoStatus('SENT')).toBe('SENT')
  })
  it('offers the actions of the status', () => {
    const can = { manage: true, approve: true }
    expect(poActions(undefined, undefined, can)).toMatchObject({ save: true, submit: true, send: false })
    expect(poActions('PENDING_APPROVAL', 'PENDING', can)).toMatchObject({ approve: true, save: false, cancel: true })
    expect(poActions('APPROVED', 'APPROVED', can)).toMatchObject({ send: true, close: false })
    expect(poActions('PARTIALLY_RECEIVED', 'APPROVED', can)).toMatchObject({ close: true, cancel: false })
    expect(poActions('RECEIVED', 'APPROVED', can)).toMatchObject({ close: false, cancel: false, send: false })
  })
})

describe('adjustments: signed qty (prompt 11 §F)', () => {
  it('sends decreases negative', () => {
    expect(signedQty('INCREASE', 5)).toBe(5)
    expect(signedQty('DECREASE', 5)).toBe(-5)
    expect(signedQty('WRITE_OFF', -3)).toBe(-3)
    expect(signedQty('INCREASE', -2)).toBe(2)
  })
})

describe('receipts: line defaults from the open PO line (prompt 11 §D)', () => {
  const po = { purchaseOrderLineId: 'pl1', pendingQty: '8', unitPrice: 120 }
  it('defaults the qty to what is open and sends no price unless changed', () => {
    expect(receiptLineFromPo(po)).toEqual({ purchaseOrderLineId: 'pl1', qty: 8, unitPrice: null })
    expect(receiptLineFromPo(po, 3, 120)).toEqual({ purchaseOrderLineId: 'pl1', qty: 3, unitPrice: null })
    expect(receiptLineFromPo(po, 3, 110)).toEqual({ purchaseOrderLineId: 'pl1', qty: 3, unitPrice: 110 })
  })
})

describe('stock snapshot (prompt 11 §A)', () => {
  it('sums on hand, weights the cost and adds the open PO qty', () => {
    const bal = (qty: number, cost: number) => ({ qtyOnHand: qty, avgUnitCost: cost, stockValue: qty * cost }) as never
    expect(stockSnapshot([bal(10, 100), bal(30, 120), bal(0, 999)], [{ pendingQty: '5' }, { pendingQty: 2 }] as never)).toEqual({
      totalQtyOnHand: 40, totalQtyReserved: 0, totalQtyAvailable: 40, avgCostPerUnit: 115, lowestCostPerUnit: 100, highestCostPerUnit: 120, pendingQty: 7,
    })
  })
  it('sums the real reserved / available qty (prompt 19 §B)', () => {
    const b = (onHand: number, reserved: number, available?: number) => ({ qtyOnHand: onHand, qtyReserved: reserved, qtyAvailable: available ?? null, avgUnitCost: 1, stockValue: onHand }) as never
    expect(stockSnapshot([b(10, 4, 6), b(5, 1)], [])).toMatchObject({ totalQtyOnHand: 15, totalQtyReserved: 5, totalQtyAvailable: 10 })
  })
})
