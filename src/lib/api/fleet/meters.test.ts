import { describe, expect, it } from 'vitest'
import { allowedMeterTypes, recordError, toRecordRequest, toView, type MeterReadingDto, type RecordInput } from './meters'

const base: RecordInput = { assetProfileId: 'a1', assetMeterType: 'KM_HOUR', readingAt: '2026-11-20T08:30', meterType: 'KM', km: 120500, remarks: ' ok ' }

describe('meter type mapping (prompt 08 §A)', () => {
  it('KM sends km only', () => {
    const r = toRecordRequest({ ...base, hours: 99 })
    expect(r).toMatchObject({ assetProfileId: 'a1', km: 120500, hours: null, driverId: null, remarks: 'ok' })
    expect(r.readingAt).toBe(new Date('2026-11-20T08:30').toISOString())
  })
  it('HOUR sends hours only', () => {
    expect(toRecordRequest({ ...base, meterType: 'HOUR', hours: 3500.5 })).toMatchObject({ km: null, hours: 3500.5 })
  })
  it('BOTH sends both in one request', () => {
    expect(toRecordRequest({ ...base, meterType: 'BOTH', hours: 3500, driverId: 'd1' })).toMatchObject({ km: 120500, hours: 3500, driverId: 'd1' })
  })
})

describe('what the asset allows', () => {
  it('follows the asset meter type', () => {
    expect(allowedMeterTypes('KM')).toEqual(['KM'])
    expect(allowedMeterTypes('HOUR')).toEqual(['HOUR'])
    expect(allowedMeterTypes('KM_HOUR')).toEqual(['KM', 'HOUR', 'BOTH'])
    expect(allowedMeterTypes('NONE')).toEqual([])
  })
  it('refuses a type the asset has no meter for, and missing values', () => {
    expect(recordError({ ...base, assetMeterType: 'KM', meterType: 'HOUR', hours: 1 })).toBe('meter.rule.typeNotAllowed')
    expect(recordError({ ...base, assetMeterType: 'NONE' })).toBe('meter.rule.noMeter')
    expect(recordError({ ...base, meterType: 'BOTH' })).toBe('meter.rule.hours')
    expect(recordError({ ...base, km: undefined })).toBe('meter.rule.km')
    expect(recordError({ ...base, assetProfileId: '' })).toBe('meter.rule.asset')
    expect(recordError(base)).toBeNull()
  })
})

describe('list row', () => {
  it('maps a reading to the old list fields', () => {
    const d: MeterReadingDto = {
      meterReadingId: 'r1', assetProfileId: 'a1', assetCode: 'TR-01', registrationNo: '70-1', branchId: 'b', meterKind: 'HOUR',
      readingValue: '3500.5', lifetimeValue: 3500.5, readingAt: '2026-11-20T01:30:00Z', source: 'MANUAL', sourceRefNo: null,
      driverCode: 'DRV-1', status: 'SUSPECT', suspectReason: 'Lower than before', reversesMeterReadingId: null, remarks: null,
      sinceLast: '12.5', createdAt: '2026-11-20T01:31:00Z',
    }
    expect(toView(d)).toMatchObject({ id: 'r1', equipmentCode: 'TR-01', meterType: 'HOUR', value: 3500.5, sinceLast: 12.5, driverName: 'DRV-1', status: 'SUSPECT' })
  })
})
