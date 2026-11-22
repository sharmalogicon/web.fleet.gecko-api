import { describe, expect, it } from 'vitest'
import { accidentActions, accidentFormSchema, NEW_ACCIDENT_FORM, toFormValues, toParties, toRequest, type AccidentDto, type AccidentFormValues } from './accidents'

const dto = (p: Partial<AccidentDto> = {}): AccidentDto => ({
  accidentId: 'ac1', branchId: 'b1', documentNo: 'ACC-0001', documentDate: '2026-11-20', status: 'OPEN', occurredAt: '2026-11-19T03:00:00Z',
  assetProfileId: 'a1', assetCode: 'TRK-01', registrationNo: null, driverId: 'd1', driverCode: 'DRV1', driverName: 'Somchai',
  accidentType: 'COLLISION', responsibility: 'THIRD_PARTY', locationText: 'Bangna km 5', address: null, city: 'Bangkok', countryCode: 'TH',
  latitude: 13.7, longitude: 100.6, policeStation: null, policeReportNo: null, hasInjuries: true, description: 'rear-ended', damageDetails: null,
  insurancePolicyNo: 'POL-1', isClaimable: true, estimatedCost: '25000', currencyCode: 'THB', workRequestId: null, workRequestNo: null,
  claimId: null, claimNo: null, claimStatus: null, closedAt: null, cancelReason: null, remarks: 'keep',
  parties: [{ accidentPartyId: 'p1', lineNo: 1, partyCode: null, partyName: 'Other Co', vehiclePlate: '1กข-123', vehicleDescription: null,
    insurerName: 'Viriyah', insurerPolicyNo: null, contactName: null, contactPhone: '081', statement: null }],
  workOrders: [], createdAt: '2026-11-19T03:10:00Z', rowVersion: 'rv1',
  ...p,
})

describe('accident third party ↔ parties[] (prompt 14 §C, owner Q5)', () => {
  it('one third party on the screen = a one-item list; none = empty list', () => {
    const v = toFormValues(dto())
    expect(v).toMatchObject({ tpName: 'Other Co', tpPlate: '1กข-123', tpInsurer: 'Viriyah', tpPhone: '081' })
    expect(toParties(v)).toEqual([{ partyName: 'Other Co', partyCode: null, vehiclePlate: '1กข-123', vehicleDescription: null, insurerName: 'Viriyah',
      insurerPolicyNo: null, contactName: null, contactPhone: '081', statement: null }])
    expect(toParties({ ...v, tpName: '  ' })).toEqual([])
  })
  it('details without a name are refused', () => {
    const r = accidentFormSchema.safeParse({ ...NEW_ACCIDENT_FORM, equipmentCode: 'X', assetProfileId: 'a', tpPlate: 'AB-1' })
    expect(r.error?.issues.map((i) => i.message)).toContain('accident.rule.tpName')
  })
})

describe('accident request', () => {
  it('sends ids, keeps fields with no input, free driver name only when not on file', () => {
    const current = dto()
    const r = toRequest(toFormValues(current), current)
    expect(r).toMatchObject({ assetProfileId: 'a1', driverId: 'd1', driverName: null, accidentType: 'COLLISION', countryCode: 'TH',
      latitude: 13.7, hasInjuries: true, estimatedCost: 25000, remarks: 'keep', rowVersion: 'rv1', isClaimable: true })
    const free: AccidentFormValues = { ...toFormValues(current), driverId: '', driverID: '', driverName: 'Walk-in driver' }
    expect(toRequest(free, current)).toMatchObject({ driverId: null, driverName: 'Walk-in driver' })
  })
  it('country must be 2 letters', () => {
    const r = accidentFormSchema.safeParse({ ...NEW_ACCIDENT_FORM, equipmentCode: 'X', assetProfileId: 'a', country: 'Thailand' })
    expect(r.error?.issues[0].message).toBe('accident.rule.country')
  })
})

describe('accident actions', () => {
  const can = { manage: true, raiseWr: true }
  it('raise WR once, from OPEN; cancel OPEN only; close blocked while a WO is open', () => {
    expect(accidentActions(dto(), can)).toMatchObject({ save: true, raiseWr: true, close: true, closeBlocked: false, cancel: true })
    expect(accidentActions(dto({ workRequestId: 'wr1' }), can).raiseWr).toBe(false)
    const repair = dto({ status: 'UNDER_REPAIR', workRequestId: 'wr1', workOrders: [{ workOrderId: 'w', documentNo: 'WO1', status: 'IN_PROGRESS', documentDate: null, totalCost: 0 }] })
    expect(accidentActions(repair, can)).toMatchObject({ raiseWr: false, close: true, closeBlocked: true, cancel: false })
    expect(accidentActions(dto({ status: 'CLOSED' }), can)).toMatchObject({ save: false, close: false, cancel: false })
    expect(accidentActions(dto(), { manage: true, raiseWr: false }).raiseWr).toBe(false)
  })
})
