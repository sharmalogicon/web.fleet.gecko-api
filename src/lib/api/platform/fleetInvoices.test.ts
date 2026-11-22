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
  it('invoice lines take equipment / source type / ref from their charge', () => {
    const lines = toInvoiceLines(
      [{ invoiceLineId: 'l1', lineNo: 1, workOrderNo: 'WO-1', chargeCode: 'WO_LABOR', chargeName: 'Labour', quantity: '2', unitRate: '450', amount: '900', taxCode: null, taxRate: 7, taxAmount: 63, fleetChargeId: 'c1' }],
      [{ fleetChargeId: 'c1', assetCode: 'TRK-01', sourceLineType: 'LABOR', rateCardRef: 'CARD:3', rechargeNo: 'RC-1', workOrderNo: 'WO-1' } as never],
    )
    expect(lines[0]).toMatchObject({ workOrderNo: 'WO-1', equipmentCode: 'TRK-01', serviceType: 'LABOR', stockType: 'CARD:3', transactionType: 'RC-1', quantity: 2, unitPrice: 450, totalAmount: 900 })
  })
})

describe('invoice lines carrying their charge fields (owner answer 12 Q6)', () => {
  it('uses the line fields first and needs no join', async () => {
    const { linesNeedCharges, toInvoiceLines } = await import('./fleetInvoices')
    const line = { invoiceLineId: 'l1', lineNo: 1, workOrderNo: 'WO-1', chargeCode: 'WO_PARTS', chargeName: 'Parts', quantity: 1, unitRate: 10, amount: 10, taxCode: null, taxRate: 7, taxAmount: 0.7, fleetChargeId: 'c1', assetCode: 'TRK-2', sourceLineType: 'PART', rateCardRef: 'COST', rechargeNo: 'RC-2' }
    expect(linesNeedCharges([line])).toBe(false)
    expect(toInvoiceLines([line], [])[0]).toMatchObject({ equipmentCode: 'TRK-2', serviceType: 'PART', stockType: 'COST', transactionType: 'RC-2' })
    const { assetCode: _a, sourceLineType: _s, rateCardRef: _r, rechargeNo: _n, ...bare } = line
    void _a; void _s; void _r; void _n
    expect(linesNeedCharges([bare])).toBe(true)
  })
})
