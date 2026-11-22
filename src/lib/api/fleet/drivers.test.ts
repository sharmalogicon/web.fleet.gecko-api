import { describe, expect, it } from 'vitest'
import { apiStatus, apiStatusFilter, mapFieldErrors, personalValues, toRequest, toViewModel, viewStatus, type DriverDto, type DriverPersonal } from './drivers'

const dto = (p: Partial<DriverDto> = {}): DriverDto => ({
  driverId: 'd1', branchId: 'b1', driverSource: 'TRUCKING', truckingDriverCode: 'T01', driverCode: 'DRV-01', fullName: 'Somchai',
  nickname: 'Chai', userId: 'u1', userName: 'chai', licenceClass: 'B2', licenceExpiryDate: '2027-01-01', employmentType: 'SUBCON',
  employerPartyCode: 'SUP-1', hiredOn: '2020-01-01', leftOn: null, status: 'ACTIVE', sourceStatus: 'ACTIVE', sourceSyncedAt: null,
  positionTitle: 'Driver', costPerHour: '120', otCostPerHour: 180, currencyCode: 'THB', ratesHidden: false, fuelCardNo: 'FC1',
  remarks: null, rowVersion: 'rv', ...p,
})

const personal = (p: Partial<DriverPersonal> = {}): DriverPersonal => ({
  driverId: 'd1', heldIn: 'TRUCKING', valuesAvailable: true, licenceCountryCode: 'TH', licenceNoLast4: '1234', licenceNo: null,
  nationalIdType: 'TH_ID', nationalIdNo: '1-1111', mobile: '081', address: '1 Road', birthDate: '1990-02-03', socialSecurityNo: 'SS',
  phone: '02', fax: null, email: 'a@b.c', emergencyContactName: 'Mom', emergencyContactPhone: '089', emergencyContactRelation: 'MOTHER',
  licenceNoOnFile: true, nationalIdOnFile: true, mobileOnFile: true, addressOnFile: true, extraOnFile: true, anonymisedAt: null, ...p,
})

describe('driver status', () => {
  it('maps API → screen', () => {
    expect(viewStatus('LEAVE', null)).toBe('ON LEAVE')
    expect(viewStatus('INACTIVE', '2026-01-01', '2026-11-20')).toBe('TERMINATED')
    expect(viewStatus('INACTIVE', '2027-01-01', '2026-11-20')).toBe('INACTIVE')
    expect(viewStatus('INACTIVE', null)).toBe('INACTIVE')
  })
  it('maps screen → API; TERMINATED needs a leaving date', () => {
    expect(apiStatus('ON LEAVE', undefined)).toEqual({ status: 'LEAVE', leftOn: null })
    expect(apiStatus('TERMINATED', '2026-05-01')).toEqual({ status: 'INACTIVE', leftOn: '2026-05-01' })
    expect(apiStatus('TERMINATED', undefined).leftOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('filters TERMINATED and INACTIVE as INACTIVE', () => {
    expect(apiStatusFilter('TERMINATED')).toBe('INACTIVE')
    expect(apiStatusFilter('ALL')).toBeUndefined()
  })
})

describe('driver adapter', () => {
  it('maps the record to the form names', () => {
    expect(toViewModel(dto())).toMatchObject({
      id: 'd1', isTrucking: true, driverCode: 'DRV-01', driverName: 'Somchai', position: 'Driver', standardRate: 120,
      overtimeRate: 180, fuelCard: 'FC1', licenseExpiryDate: '2027-01-01', dateHire: '2020-01-01', status: 'ACTIVE',
    })
  })
  it('sends back the fields the form has no input for', () => {
    const v = toViewModel(dto())
    expect(toRequest({ ...v, position: 'Senior' }, v)).toMatchObject({
      branchId: 'b1', nickname: 'Chai', userId: 'u1', licenceClass: 'B2', employmentType: 'SUBCON', employerPartyCode: 'SUP-1',
      positionTitle: 'Senior', costPerHour: 120, otCostPerHour: 180, currencyCode: 'THB', rowVersion: 'rv',
    })
  })
  it('keeps hidden rates as stored and sends no currency without rates', () => {
    const hidden = toViewModel(dto({ ratesHidden: true, costPerHour: null, otCostPerHour: null }))
    expect(hidden.standardRate).toBeUndefined()
    expect(toRequest(hidden, hidden)).toMatchObject({ costPerHour: null, otCostPerHour: null, currencyCode: null })
  })
  it('creates a FLEET driver at the given branch with THB rates', () => {
    expect(toRequest({ driverCode: 'op-1', driverName: 'Op', status: 'ACTIVE', standardRate: 90 }, undefined, 'b9'))
      .toMatchObject({ branchId: 'b9', driverCode: 'OP-1', employmentType: 'EMPLOYEE', costPerHour: 90, currencyCode: 'THB', rowVersion: null })
  })
  it('maps API field errors', () => {
    expect(mapFieldErrors({ fuelcardno: 'used', x: 'y' })).toEqual({ fields: { fuelCard: 'used' }, other: ['y'] })
  })
})

describe('personalValues', () => {
  it('fills the read-only fields from Trucking', () => {
    expect(personalValues(personal(), 'ON FILE')).toMatchObject({
      licenseNo: '•••• 1234', idNo: '1-1111', mobilePhoneNumber: '081', address1: '1 Road', dob: '1990-02-03', emailID: 'a@b.c', contactPerson: 'Mom', faxNumber: '',
    })
  })
  it('shows the full licence number when sent', () => {
    expect(personalValues(personal({ licenceNo: 'AB-99' }), 'x').licenseNo).toBe('AB-99')
  })
  it('says "on file" when the server cannot decrypt', () => {
    const v = personalValues(personal({ valuesAvailable: false, mobileOnFile: false }), 'ON FILE')
    expect(v.idNo).toBe('ON FILE')
    expect(v.mobilePhoneNumber).toBe('')
    expect(v.emailID).toBe('ON FILE')
  })
  it('is empty for a FLEET driver', () => {
    expect(personalValues(personal({ heldIn: 'NONE' }), 'x')).toEqual({})
    expect(personalValues(null, 'x')).toEqual({})
  })
})
