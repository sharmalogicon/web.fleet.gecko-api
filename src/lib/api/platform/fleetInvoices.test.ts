import { describe, expect, it } from 'vitest'
import { partyAddress, toInvoiceLines, viewInvoiceStatus } from './fleetInvoices'

describe('WO invoices on the Revenue fleet API (prompt 12 §D)', () => {
  it('ISSUED → ACTIVE', () => {
    expect(viewInvoiceStatus('ISSUED')).toBe('ACTIVE')
    expect(viewInvoiceStatus('CANCELLED')).toBe('CANCELLED')
  })
  it('address from the party', () => {
    expect(partyAddress({ address: '1 Rama IV', address2: null, city: 'Bangkok', state: null, postcode: '10500' })).toBe('1 Rama IV, Bangkok 10500')
    expect(partyAddress(null)).toBe('')
  })
  it('invoice lines carry their charge fields (backend #13)', () => {
    const line = { invoiceLineId: 'l1', lineNo: 1, workOrderNo: 'WO-1', chargeCode: 'WO_PARTS', chargeName: 'Parts', quantity: '2', unitRate: '450', amount: '900', taxCode: null, taxRate: 7, taxAmount: 63, fleetChargeId: 'c1', assetCode: 'TRK-2', sourceLineType: 'PART', rateCardRef: 'COST', rechargeNo: 'RC-2' }
    expect(toInvoiceLines([line as never])[0]).toMatchObject({ workOrderNo: 'WO-1', equipmentCode: 'TRK-2', serviceType: 'PART', stockType: 'COST', transactionType: 'RC-2', quantity: 2, unitPrice: 450, totalAmount: 900 })
  })
})
