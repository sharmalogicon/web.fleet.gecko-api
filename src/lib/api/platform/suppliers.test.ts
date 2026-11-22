import { describe, expect, it } from 'vitest'
import { mapFieldErrors, termsOf, toCreateRequest, toSaveRequest, toViewModel, type SupplierDto } from './suppliers'

const dto = (p: Partial<SupplierDto> = {}): SupplierDto => ({
  partyId: 'p1', partyCode: 'SUP-0001', nameEn: 'Fast Haul Co.', nameLocal: null, shortName: null, taxId: null, branchNo: null,
  registrationNo: 'REG-1', address: '1 Road', phone: '02-1', email: 'a@b.c', countryCode: 'TH', defaultCurrency: 'THB', isActive: true,
  otherRoles: [], categories: ['TRANSPORT', 'TOWING'], paymentTermCode: 'NET30', creditTermDays: 30, withholdingTaxCode: 'WHT3',
  leadTimeDays: 2, minOrderAmount: null, minOrderCurrency: null, erpBpCode: 'V100', rating: 4, supplierStatus: 'ON_HOLD',
  statusReason: 'late', updatedAt: '2026-11-19', rowVersion: 'rv', partyRowVersion: 'prv', ...p,
})

describe('suppliers adapter (Transporters page)', () => {
  it('maps to the transporter form', () => {
    expect(toViewModel(dto())).toMatchObject({
      partyCode: 'SUP-0001', transporterName: 'Fast Haul Co.', registrationNo: 'REG-1', emailID: 'a@b.c', mobileNo: '02-1',
      billingAddress: '1 Road', isActive: true, partyLocked: false,
    })
  })

  it('creates a TRANSPORT supplier', () => {
    expect(toCreateRequest({ transporterName: ' New ', registrationNo: 'R', emailID: '', isActive: true })).toEqual({
      nameEn: 'New', registrationNo: 'R', email: null, phone: null, address: null, terms: { categories: ['TRANSPORT'], supplierStatus: 'APPROVED' },
    })
  })

  it('sends the terms back unchanged, TRANSPORT kept', () => {
    expect(termsOf(dto())).toMatchObject({ categories: ['TRANSPORT', 'TOWING'], paymentTermCode: 'NET30', supplierStatus: 'ON_HOLD', erpBpCode: 'V100' })
    expect(termsOf(dto({ categories: ['TYRE'] })).categories).toEqual(['TYRE', 'TRANSPORT'])
  })

  it('sends the party fields with both row versions', () => {
    const v = toViewModel(dto())
    expect(toSaveRequest({ ...v, transporterName: 'Renamed', isActive: false }, v)).toMatchObject({
      nameEn: 'Renamed', isActive: false, rowVersion: 'rv', partyRowVersion: 'prv',
    })
  })

  it('leaves the party fields out when the party has other roles', () => {
    const v = toViewModel(dto({ otherRoles: ['CUSTOMER'] }))
    expect(v.partyLocked).toBe(true)
    const r = toSaveRequest({ ...v, transporterName: 'Renamed' }, v)
    expect(r.nameEn).toBeUndefined()
    expect(r.partyRowVersion).toBeUndefined()
    expect(r.rowVersion).toBe('rv')
  })

  it('maps field errors; terms.* go to the banner', () => {
    expect(mapFieldErrors({ nameen: 'x', 'terms.creditTermDays': 'y' })).toEqual({ fields: { transporterName: 'x' }, other: ['y'] })
  })
})
