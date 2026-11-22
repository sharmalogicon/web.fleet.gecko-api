import { describe, expect, it } from 'vitest'
import { claimActions, claimTotals, toFormValues, toLineInput, toRequest, type InsuranceClaimDto } from './insuranceClaims'

const dto = (p: Partial<InsuranceClaimDto> = {}): InsuranceClaimDto => ({
  insuranceClaimId: 'c1', branchId: 'b1', documentNo: 'CLM-0001', documentDate: '2026-11-21', status: 'DRAFT', accidentId: 'ac1', accidentNo: 'ACC-0001',
  assetProfileId: 'a1', assetCode: 'TRK-01', driverCode: 'DRV1', driverName: 'Somchai', insurerPartyCode: 'VIRIYAH', insurerName: 'Viriyah',
  policyNo: 'POL-1', insurerClaimNo: null, contactPerson: null, claimedByName: 'Fleet Mgr', revisedFromClaimId: null, revisedFromNo: null,
  currencyCode: 'THB', subtotalAmount: '1500', discountAmount: '100', taxRate: '7', taxAmount: '98', totalAmount: '1498', approvedAmount: null,
  deductibleAmount: null, settledAmount: null, submittedAt: null, decidedAt: null, decisionReason: null, settledAt: null, settlementRef: null,
  erpRef: null, cancelReason: null, remarks: null, createdAt: '2026-11-21T00:00:00Z', rowVersion: 'rv1',
  lines: [
    { insuranceClaimLineId: 'l2', lineNo: 2, lineKind: 'OTHER', source: 'MANUAL', sourceLineId: null, workOrderId: null, workOrderNo: null, itemId: null,
      itemCode: null, description: 'Towing', qty: 1, unitPrice: 500, amount: 500, approvedAmount: null, remarks: null },
    { insuranceClaimLineId: 'l1', lineNo: 1, lineKind: 'PART', source: 'WO_PART', sourceLineId: 'wp1', workOrderId: 'w1', workOrderNo: 'WO-1', itemId: 'i1',
      itemCode: 'BUMPER', description: 'Bumper', qty: 2, unitPrice: 500, amount: 1000, approvedAmount: null, remarks: null },
  ],
  ...p,
})

describe('insurance claim request (prompt 14 §D)', () => {
  it('never sends totals; keyed discount + VAT; lines in line order; WO lines keep source + sourceLineId', () => {
    const v = toFormValues(dto())
    expect(v.lines.map((l) => l.description)).toEqual(['Bumper', 'Towing'])
    const r = toRequest(v, dto())
    expect(r).toMatchObject({ accidentId: 'ac1', insurerPartyCode: 'VIRIYAH', insurerName: 'Viriyah', discountAmount: 100, taxRate: 7, rowVersion: 'rv1' })
    expect(r).not.toHaveProperty('totalAmount')
    expect(r).not.toHaveProperty('subtotalAmount')
    expect(r.lines?.[0]).toEqual({ lineKind: 'PART', description: 'Bumper', qty: 2, unitPrice: 500, source: 'WO_PART', sourceLineId: 'wp1', itemId: 'i1', remarks: null })
    expect(r.lines?.[1]).toMatchObject({ source: 'MANUAL', sourceLineId: null })
  })
  it('lines unchanged → null; a keyed line is always MANUAL', () => {
    expect(toRequest(toFormValues(dto()), dto(), false).lines).toBeNull()
    expect(toLineInput({ lineKind: 'LABOR', description: ' x ', qty: 1, unitPrice: 2, source: 'WO_LABOR' })).toMatchObject({ source: 'MANUAL', sourceLineId: null, description: 'x' })
  })
  it('totals preview = the API rule (subtotal − discount, then VAT)', () => {
    expect(claimTotals(toFormValues(dto()))).toEqual({ subtotal: 1500, discount: 100, tax: 98, total: 1498 })
  })
})

describe('insurance claim actions', () => {
  const can = { manage: true, approve: true }
  it('follows the status', () => {
    expect(claimActions(dto(), can)).toMatchObject({ save: true, copyFromWos: true, submit: true, decision: false, revise: false, cancel: true })
    expect(claimActions(dto({ status: 'SUBMITTED' }), can)).toMatchObject({ save: false, decision: true, revise: true, cancel: true })
    expect(claimActions(dto({ status: 'SUBMITTED' }), { manage: true, approve: false }).decision).toBe(false)
    expect(claimActions(dto({ status: 'APPROVED' }), can)).toMatchObject({ settle: true, revise: true, cancel: false })
    expect(claimActions(dto({ status: 'SETTLED' }), can)).toMatchObject({ settle: false, revise: false, cancel: false, save: false })
  })
})
