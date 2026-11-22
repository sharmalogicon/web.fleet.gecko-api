import { describe, expect, it } from 'vitest'
import { poLineAmount, poLinesFromGoodsRequest } from '@/components/purchase-orders/PurchaseOrderViews'
import { lineFromOpenPo, viewReceiptStatus } from '@/components/goods-receipts/GoodsReceiptViews'
import { returnableLines } from '@/components/return-to-vendor/ReturnViews'
import { mergeAdjustmentRows } from '@/components/goods-adjustments/AdjustmentViews'
import { variance } from '@/components/stock-counts/StockCountViews'
import { issuedByPart } from '@/components/work-orders/IssueFromStockDialog'
import { toMonitorRow } from '@/components/spare-parts/SparePartsMonitorView'

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('prompt 11 screen helpers', () => {
  it('PO line amount: qty × price − % or amount discount', () => {
    expect(poLineAmount({ qty: '4', unitPrice: '25', discountType: '', discountValue: '9' })).toBe(100)
    expect(poLineAmount({ qty: '4', unitPrice: '25', discountType: 'PERCENT', discountValue: '10' })).toBe(90)
    expect(poLineAmount({ qty: '4', unitPrice: '25', discountType: 'AMOUNT', discountValue: '15' })).toBe(85)
  })

  it('Create PO from a goods request: only open lines, base qty, empty UoM for items', () => {
    const gr: any = { workOrderId: 'wo1', lines: [
      { goodsRequestLineId: 'l1', itemId: 'i1', itemCode: 'OIL', description: 'Oil', uomCode: 'BOX', openBaseQty: '12', remarks: null, woPartId: 'p1' },
      { goodsRequestLineId: 'l2', itemId: null, itemCode: null, description: 'Special bolt', uomCode: 'EA', openBaseQty: 2, remarks: 'x', woPartId: null },
      { goodsRequestLineId: 'l3', itemId: 'i3', itemCode: 'F', description: 'Filter', uomCode: 'EA', openBaseQty: 0, remarks: null, woPartId: null },
    ] }
    const lines = poLinesFromGoodsRequest(gr)
    expect(lines.map((l) => [l.goodsRequestLineId, l.qty, l.uomCode, l.workOrderId])).toEqual([['l1', '12', '', 'wo1'], ['l2', '2', 'EA', 'wo1']])
  })

  it('receipt line from an open PO line: qty = still open, price = PO price', () => {
    const l = lineFromOpenPo({ purchaseOrderId: 'po', purchaseOrderNo: 'PO-1', purchaseOrderLineId: 'pl', lineNo: 1, itemId: 'i', itemCode: 'OIL', description: 'Oil', uomCode: 'L', qty: 10, receivedQty: 4, pendingQty: '6', unitPrice: '120.5', warehouseId: null, requiredDate: null })
    expect([l.purchaseOrderLineId, l.qty, l.unitPrice, l.poQty, l.poNo]).toEqual(['pl', '6', '120.5', 6, 'PO-1'])
    expect(viewReceiptStatus('POSTED')).toBe('RECEIVED')
    expect(viewReceiptStatus('DRAFT')).toBe('DRAFT')
  })

  it('returnable receipt lines: baseQty − returned > 0', () => {
    const r: any = { lines: [{ goodsReceiptLineId: 'a', baseQty: 5, returnedBaseQty: 2 }, { goodsReceiptLineId: 'b', baseQty: 3, returnedBaseQty: 3 }] }
    expect(returnableLines([r]).map((x) => [x.line.goodsReceiptLineId, x.remaining])).toEqual([['a', 3]])
  })

  it('adjustment list merges transfers as TRANSFER, newest first', () => {
    const rows = mergeAdjustmentRows(
      [{ stockAdjustmentId: 'a', documentNo: 'ADJ-1', documentDate: '2026-11-01', adjustmentType: 'INCREASE', status: 'POSTED', remarks: null, totalAmount: '10' } as any],
      [{ stockTransferId: 't', documentNo: 'TRF-1', documentDate: '2026-11-05', status: 'IN_TRANSIT', remarks: 'r', totalCost: 5 } as any],
    )
    expect(rows.map((r) => [r.kind, r.type, r.amount])).toEqual([['trf', 'TRANSFER', 5], ['adj', 'INCREASE', 10]])
  })

  it('stock count variance', () => {
    expect(variance(10, '')).toBeNull()
    expect(variance('10', '8')).toBe(-2)
    expect(variance(10, 12.5)).toBe(2.5)
  })

  it('issued qty per WO part from posted issues and returns', () => {
    expect(issuedByPart([
      { status: 'POSTED', issueKind: 'ISSUE', lines: [{ woPartId: 'p1', baseQty: 4 }, { woPartId: null, baseQty: 9 }] },
      { status: 'POSTED', issueKind: 'RETURN', lines: [{ woPartId: 'p1', baseQty: 1 }] },
      { status: 'CANCELLED', issueKind: 'ISSUE', lines: [{ woPartId: 'p1', baseQty: 100 }] },
    ] as any)).toEqual({ p1: 3 })
  })

  it('spare parts monitoring row: POSTED → ACTIVE, CANCELLED → INACTIVE', () => {
    const base: any = { documentNo: 'ISS-1', documentDate: '2026-11-02', workOrderNo: 'WO-1', assetCode: 'TRK-01', totalCost: '250', issueKind: 'ISSUE', postedAt: null, remarks: null }
    expect(toMonitorRow({ ...base, status: 'POSTED' }, 0)).toMatchObject({ workOrderNo: 'WO-1', equipmentCode: 'TRK-01', grandTotal: 250, status: 'ACTIVE', remarks: 'ISS-1' })
    expect(toMonitorRow({ ...base, status: 'CANCELLED' }, 1).status).toBe('INACTIVE')
  })
})
