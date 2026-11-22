import { describe, expect, it } from 'vitest'
import { cnActions, cnTotals, lineFromReturn, newCnForm, toLineInput, toRequest, type VendorReturnDto } from './vendorCreditNotes'

describe('vendor credit note (prompt 15 §C)', () => {
  it('RTV_LINE from a posted return: qty / price empty (= the return\'s); MANUAL carries description + GL', () => {
    const ret = { documentNo: 'RTV-1' } as VendorReturnDto
    const l = lineFromReturn(ret, { vendorReturnLineId: 'r1', lineNo: 1, goodsReceiptLineId: 'g1', purchaseOrderNo: 'PO-1', itemId: 'i1', itemCode: 'OIL',
      description: 'Oil', serialNo: null, baseQty: 2, unitCostBase: 100, creditUnitPrice: 100, creditAmount: 200, remarks: null } as VendorReturnDto['lines'][number])
    expect(toLineInput(l)).toEqual({ source: 'RTV_LINE', sourceLineId: 'r1', qty: null, unitPrice: null, description: null, glCode: null })
    expect(toLineInput({ source: 'MANUAL', sourceLineId: 'x', description: ' Rebate ', qty: 1, unitPrice: 50, glCode: '5100' }))
      .toEqual({ source: 'MANUAL', sourceLineId: null, qty: 1, unitPrice: 50, description: 'Rebate', glCode: '5100' })
  })
  it('request: tax type NONE → rate 0; links + reason; totals never sent', () => {
    const v = { ...newCnForm('b1', 'sup1'), creditNoteNo: ' CN-9 ', vendorInvoiceId: 'v1', taxType: 'NONE', vat: 7,
      lines: [{ source: 'MANUAL' as const, description: 'x', qty: 1, unitPrice: 10 }] }
    const r = toRequest(v)
    expect(r).toMatchObject({ branchId: 'b1', supplierPartyCode: 'SUP1', vendorCreditNoteNo: 'CN-9', vendorInvoiceId: 'v1', vendorReturnId: null, reasonCode: 'RETURN', taxRate: 0, taxCode: null })
    expect(r).not.toHaveProperty('totalAmount')
    expect(cnTotals({ ...v, taxType: 'VAT', discountType: 'AMOUNT', discount: 0, lines: [{ source: 'MANUAL', qty: 2, unitPrice: 50 }] })).toEqual({ subtotal: 100, discount: 0, tax: 7, total: 107 })
  })
  it('actions', () => {
    const can = { manage: true, approve: true }
    expect(cnActions(undefined, can)).toMatchObject({ save: true, approve: false })
    expect(cnActions({ status: 'DRAFT' } as never, can)).toMatchObject({ save: true, approve: true, cancel: true })
    expect(cnActions({ status: 'EXPORTED' } as never, can)).toMatchObject({ save: false, approve: false, cancel: false })
  })
})
