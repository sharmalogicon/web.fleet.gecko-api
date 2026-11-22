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
