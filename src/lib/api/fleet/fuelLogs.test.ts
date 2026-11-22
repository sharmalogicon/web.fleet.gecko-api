import { describe, expect, it } from 'vitest'
import { fuelActions, fuelFormSchema, toFormValues, toRequest, toRow, type FuelFormValues, type FuelLogDto } from './fuelLogs'

const dto = (p: Partial<FuelLogDto> = {}): FuelLogDto => ({
  fuelLogId: 'f1', branchId: 'b1', documentNo: 'FUEL-0001', documentDate: '2026-11-20', status: 'DRAFT', assetProfileId: 'a1', assetCode: 'TRK-01',
  registrationNo: '70-1234', driverId: 'd1', driverCode: 'DRV1', driverName: 'Somchai', fuelCardNo: 'CARD-9', fuelledAt: '2026-11-20T01:30:00Z',
  fuelSource: 'VENDOR', warehouseId: null, warehouseCode: null, itemId: null, itemCode: null, supplierPartyCode: 'PTT', supplierName: 'PTT Station',
  voucherNo: 'R-77', liters: '120.5', unitPrice: '32.5', amount: '3916.25', currencyCode: 'THB', meterKm: '150000', meterHours: null,
  meterReadingId: null, distanceKm: '600', hours: null, kmPerLiter: '4.98', costPerKm: '6.53', costPerHour: null, decidedAt: null, decidedBy: null,
  rejectReason: null, cancelReason: null, remarks: null, createdAt: '2026-11-20T01:31:00Z', createdBy: 'u1', rowVersion: 'rv1',
  ...p,
})

const form = (p: Partial<FuelFormValues> = {}): FuelFormValues => ({
  equipmentCode: 'TRK-01', assetProfileId: 'a1', meterUpdateDate: '2026-11-20T08:30', voucherNo: ' R-77 ', tankMeter: 120.5, fuelSource: 'VENDOR',
  vendorName: 'ptt', costPerLiter: 32.5, driverId: 'd1', driverCard: 'CARD-9', warehouseId: 'w1', itemId: 'i1', meterRead: 150000, ...p,
})

describe('fuel log request (prompt 14 §B)', () => {
  it('VENDOR sends the price and supplier, never a store or item', () => {
    const r = toRequest(form(), undefined, true)
    expect(r).toMatchObject({ fuelSource: 'VENDOR', unitPrice: 32.5, supplierPartyCode: 'PTT', warehouseId: null, itemId: null, voucherNo: 'R-77', submit: true, rowVersion: null })
    expect(r.fuelledAt).toBe(new Date('2026-11-20T08:30').toISOString())
  })
  it('OWN_TANK sends store + item and no price', () => {
    const r = toRequest(form({ fuelSource: 'OWN_TANK' }), dto({ fuelSource: 'OWN_TANK' }))
    expect(r).toMatchObject({ fuelSource: 'OWN_TANK', warehouseId: 'w1', itemId: 'i1', unitPrice: null, supplierPartyCode: null, rowVersion: 'rv1', submit: false })
  })
  it('form rules: OWN_TANK needs store + item, VENDOR a price, litres > 0, not in the future', () => {
    const own = fuelFormSchema.safeParse(form({ fuelSource: 'OWN_TANK', warehouseId: '', itemId: '' }))
    expect(own.success).toBe(false)
    expect(own.error?.issues.map((i) => i.message)).toEqual(expect.arrayContaining(['fuel.rule.store', 'fuel.rule.item']))
    expect(fuelFormSchema.safeParse(form({ costPerLiter: undefined })).error?.issues[0].message).toBe('fuel.rule.price')
    expect(fuelFormSchema.safeParse(form({ tankMeter: 0 })).error?.issues[0].message).toBe('fuel.rule.liters')
    expect(fuelFormSchema.safeParse(form({ meterUpdateDate: '2999-01-01T00:00' })).error?.issues[0].message).toBe('fuel.rule.future')
    expect(fuelFormSchema.safeParse(form()).success).toBe(true)
  })
})

describe('fuel log view', () => {
  it('maps the DTO to the old screen fields', () => {
    expect(toFormValues(dto())).toMatchObject({ equipmentCode: 'TRK-01', tankMeter: 120.5, costPerLiter: 32.5, vendorName: 'PTT', driverName: 'DRV1', driverCard: 'CARD-9', meterRead: 150000, hourMeter: undefined })
    expect(toRow(dto())).toMatchObject({ fuelLogID: 'f1', tankMeter: 120.5, totalAmount: 3916.25, driverName: 'Somchai', status: 'DRAFT' })
  })
  it('actions follow the status; no approve / reject on your own entry', () => {
    expect(fuelActions(undefined, true, 'u1')).toMatchObject({ save: true, submit: true, approve: false, cancel: false })
    const pending = dto({ status: 'PENDING_APPROVAL' })
    expect(fuelActions(pending, true, 'u2')).toMatchObject({ approve: true, reject: true, save: true, submit: false })
    expect(fuelActions(pending, true, 'u1')).toMatchObject({ approve: false, reject: false })
    expect(fuelActions(dto({ status: 'APPROVED' }), true, 'u2')).toMatchObject({ save: false, cancel: true })
    expect(fuelActions(dto({ status: 'REJECTED' }), true, 'u2')).toMatchObject({ save: false, cancel: false })
    expect(fuelActions(pending, false, 'u2').approve).toBe(false)
  })
})
