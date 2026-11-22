import { describe, expect, it } from 'vitest'
import {
  apiPaymentStatus, groupUnbilled, invoiceActions, paymentActions, invoiceTotals, lineFromUnbilled, newInvoiceForm, paymentError, toFormValues, toLineInput, toPaymentRow, toRequest,
  type UnbilledLineDto, type VendorInvoiceDto, type VendorPaymentDto,
} from './vendorInvoices'

const ub = (p: Partial<UnbilledLineDto>): UnbilledLineDto => ({
  source: 'GRN_LINE', sourceLineId: 'l1', sourceDocId: 'g1', sourceDocNo: 'GRN-1', documentDate: '2026-11-20', branchId: 'b1', supplierPartyCode: 'SUP1',
  supplierName: 'Parts Co', purchaseOrderNo: 'PO-1', deliveryNoteNo: 'DN-9', supplierInvoiceNo: null, workOrderId: null, workOrderNo: null,
  assetProfileId: null, assetCode: null, itemId: 'i1', itemCode: 'OIL', description: 'Oil', uomCode: 'LTR', billableQty: 10, unitPrice: 100,
  amount: 1000, taxRate: 7, currencyCode: 'THB', isService: false, ...p,
} as UnbilledLineDto)

describe('unbilled (prompt 15 §A)', () => {
  it('groups GRN lines per GRN, sums amount + VAT; a sublet is its own row', () => {
    const rows = groupUnbilled([
      ub({}), ub({ sourceLineId: 'l2', amount: 500 }),
      ub({ source: 'WO_SUBLET', sourceLineId: 's1', sourceDocId: 'w1', sourceDocNo: 'WO-1', amount: 2000, taxRate: 0, isService: true, documentDate: '2026-11-21' }),
    ])
    expect(rows).toHaveLength(2)
    const grn = rows.find((r) => r.source === 'GRN_LINE')!
    expect(grn).toMatchObject({ grNo: 'GRN-1', poNo: 'PO-1', vendorDoNo: 'DN-9', vendorCode: 'SUP1', totalAmount: 1500, vatAmount: 105, nettAmount: 1605 })
    expect(grn.lines).toHaveLength(2)
    expect(rows[0]).toMatchObject({ source: 'WO_SUBLET', totalAmount: 2000, nettAmount: 2000 })
  })
})

const dto = (p: Partial<VendorInvoiceDto> = {}): VendorInvoiceDto => ({
  vendorInvoiceId: 'v1', branchId: 'b1', documentNo: 'VIN-1', documentDate: '2026-11-21', status: 'DRAFT', supplierPartyCode: 'SUP1', supplierName: 'Parts Co',
  supplierAddress: null, vendorInvoiceNo: 'INV-77', invoiceDate: '2026-11-20', dueDate: null, paymentTermCode: 'NET30', currencyCode: 'THB', exchangeRate: 1,
  subtotalAmount: 1000, discountType: 'AMOUNT', discountValue: 0, discountAmount: 0, taxCode: 'VAT7', taxRate: 7, taxAmount: 70, totalAmount: 1070,
  whtCode: 'WHT3', whtRate: 3, whtBaseAmount: 0, whtAmount: 0, netPayable: 1070, matchStatus: 'MATCHED', expectedAmount: 1000, varianceAmount: 0,
  creditedAmount: 0, paidAmount: 0, outstandingAmount: 1070, lastPaidAt: null, submittedAt: null, approvedAt: null, approvedBy: null, approvalNote: null,
  exportBatchId: null, exportedAt: null, erpDocNum: null, cancelReason: null, remarks: null, createdAt: '2026-11-21T00:00:00Z', createdBy: 'u1', rowVersion: 'rv1',
  lines: [{
    vendorInvoiceLineId: 'x1', lineNo: 1, source: 'GRN_LINE', sourceLineId: 'l1', sourceDocId: 'g1', sourceDocNo: 'GRN-1', purchaseOrderNo: 'PO-1', workOrderId: null,
    assetProfileId: null, assetCode: null, registrationNo: null, itemId: 'i1', itemCode: 'OIL', description: 'Oil', uomCode: 'LTR', qty: 10, unitPrice: 100,
    lineAmount: 1000, expectedQty: 10, expectedUnitPrice: 100, expectedAmount: 1000, varianceAmount: 0, matchStatus: 'MATCHED', isService: false, remarks: null,
  }],
  ...p,
} as VendorInvoiceDto)

describe('vendor invoice request (prompt 15 §B)', () => {
  it('WHT tick → 3, untick → 0; supplier upper-cased; totals never sent', () => {
    const v = toFormValues(dto())
    expect(v.isWithholdingTax).toBe(true)
    expect(toRequest(v, dto())).toMatchObject({ whtRate: 3, whtCode: 'WHT3', supplierPartyCode: 'SUP1', vendorInvoiceNo: 'INV-77', taxRate: 7, rowVersion: 'rv1' })
    expect(toRequest({ ...v, isWithholdingTax: false }, dto())).toMatchObject({ whtRate: 0, whtCode: null })
    const r = toRequest({ ...newInvoiceForm('b1', 'sup1'), vendorInvoiceNo: ' A1 ', lines: [lineFromUnbilled(ub({}))] }, undefined, true)
    expect(r).toMatchObject({ branchId: 'b1', supplierPartyCode: 'SUP1', vendorInvoiceNo: 'A1', submit: true })
    expect(r).not.toHaveProperty('totalAmount')
  })
  it('line sources: picked = qty / price empty (all billable, expected price); MANUAL = description + qty + price', () => {
    expect(toLineInput(lineFromUnbilled(ub({})))).toEqual({ source: 'GRN_LINE', sourceLineId: 'l1', qty: null, unitPrice: null, description: null, uomCode: null, isService: null })
    expect(toLineInput({ source: 'GRN_LINE', sourceLineId: 'l1', qty: 4, unitPrice: 105 })).toMatchObject({ qty: 4, unitPrice: 105 })
    expect(toLineInput({ source: 'MANUAL', sourceLineId: 'zz', description: ' Delivery ', qty: 1, unitPrice: 300, isService: true }))
      .toMatchObject({ source: 'MANUAL', sourceLineId: null, description: 'Delivery', qty: 1, unitPrice: 300, isService: true })
  })
  it('totals preview: discount, VAT, WHT on service lines only', () => {
    const t = invoiceTotals({
      lines: [{ source: 'GRN_LINE', qty: 10, unitPrice: 100 }, { source: 'MANUAL', qty: 1, unitPrice: 1000, isService: true }],
      discountType: 'PERCENT', discount: 10, vat: 7, isWithholdingTax: true,
    })
    expect(t).toEqual({ subtotal: 2000, discount: 200, tax: 126, total: 1926, whtBase: 900, wht: 27, netPayable: 1899 })
  })
  it('actions: approve / send back never to the person who keyed it; cancel not once paid', () => {
    const can = { manage: true, approve: true }
    const pending = dto({ status: 'PENDING_APPROVAL', createdBy: 'u1' })
    expect(invoiceActions(pending, can, 'u2')).toMatchObject({ approve: true, sendBack: true, save: false, cancel: true })
    expect(invoiceActions(pending, can, 'u1')).toMatchObject({ approve: false, sendBack: false })
    expect(invoiceActions(dto({ status: 'APPROVED', paidAmount: 100, outstandingAmount: 970 }), can, 'u2')).toMatchObject({ cancel: false, pay: true })
    expect(invoiceActions(dto({ status: 'PAID', outstandingAmount: 0 }), can, 'u2')).toMatchObject({ pay: false, cancel: false })
  })
})

describe('vendor payments (prompt 15 §D)', () => {
  it('maps to the old list fields; reversal flagged', () => {
    const p = { paymentId: 'p1', vendorInvoiceId: 'v1', documentNo: 'VIN-1', vendorInvoiceNo: 'INV-77', supplierPartyCode: 'SUP1', supplierName: 'Parts Co',
      paidAt: '2026-11-22', amount: -100, currencyCode: 'THB', paymentRef: 'TRF-1', source: 'MANUAL', reversesPaymentId: 'p0', remarks: null,
      createdAt: '2026-11-22', createdBy: 'u1' } as VendorPaymentDto
    expect(toPaymentRow(p)).toMatchObject({ paymentID: 'p1', receiptNo: 'TRF-1', vendorName: 'Parts Co', totalAmount: -100, isReversal: true, documentNo: 'VIN-1' })
  })
  it('amount rules', () => {
    expect(paymentError(500, 1070, false)).toBeNull()
    expect(paymentError(1100, 1070, false)).toBe('vpay.rule.tooMuch')
    expect(paymentError(0, 1070, false)).toBe('vpay.rule.amount')
    expect(paymentError(-100, 0, true)).toBeNull()
    expect(paymentError(100, 0, true)).toBe('vpay.rule.reversal')
  })
})

describe('payment approval (prompt 19 §A)', () => {
  it('screen filter → API status; approve / reject only on pending and never on your own entry', () => {
    expect(apiPaymentStatus('PENDING')).toBe('PENDING_APPROVAL')
    expect(apiPaymentStatus('APPROVED')).toBe('APPROVED')
    expect(apiPaymentStatus('ALL')).toBeUndefined()
    expect(paymentActions({ status: 'PENDING_APPROVAL', createdBy: 'u1' }, true, 'u2')).toEqual({ approve: true, reject: true })
    expect(paymentActions({ status: 'PENDING_APPROVAL', createdBy: 'u1' }, true, 'u1').approve).toBe(false)
    expect(paymentActions({ status: 'APPROVED', createdBy: 'u1' }, true, 'u2').approve).toBe(false)
    expect(toPaymentRow({ paymentId: 'p', vendorInvoiceId: 'v', documentNo: 'd', vendorInvoiceNo: 'n', supplierPartyCode: 's', supplierName: null, paidAt: '2026-11-22',
      amount: 10, currencyCode: 'THB', paymentRef: null, source: 'MANUAL', reversesPaymentId: null, remarks: null, createdAt: '', createdBy: 'u1',
      status: 'APPROVED', decidedAt: '2026-11-23' } as VendorPaymentDto)).toMatchObject({ isApproved: true, approvedOn: '2026-11-23', receiptNo: '—', vendorName: 's' })
  })
})
