import { describe, expect, it } from 'vitest'
import { needsTaxInvoice, taxInvoiceFor } from './subconDeductionInvoices'

describe('subcon deduction tax invoice (prompt 23)', () => {
  it('only for DEDUCTED recharges in mode DEDUCTION; first invoice wins', () => {
    expect(needsTaxInvoice({ rechargeMode: 'DEDUCTION', status: 'DEDUCTED' })).toBe(true)
    expect(needsTaxInvoice({ rechargeMode: 'DEDUCTION', status: 'ACCEPTED' })).toBe(false)
    expect(needsTaxInvoice({ rechargeMode: 'INVOICE', status: 'INVOICED' })).toBe(false)
    expect(needsTaxInvoice(undefined)).toBe(false)
    expect(taxInvoiceFor([{ invoiceId: 'a', invoiceNo: 'TI-1', settlementNo: 'ST-1', settledAt: '2026-11-21' }])?.invoiceNo).toBe('TI-1')
    expect(taxInvoiceFor([])).toBeNull()
  })
})

import { subconQuery, toInvoiceSource } from './subconDeductionInvoices'

describe('WO invoice page Source filter (owner-approved proposal 2026-11-22)', () => {
  it('source from the URL; filters → list call', () => {
    expect(toInvoiceSource('SUBCON')).toBe('SUBCON')
    expect(toInvoiceSource(undefined)).toBe('WO')
    expect(toInvoiceSource('x')).toBe('WO')
    expect(subconQuery({ receiptNo: ' SI-1 ', customerName: 'S001', dateFrom: '2026-11-01', dateTo: '' })).toEqual({ search: 'SI-1', from: '2026-11-01', to: undefined })
    expect(subconQuery({ receiptNo: '', customerName: 'S001', dateFrom: '', dateTo: '' }).search).toBe('S001')
  })
})
