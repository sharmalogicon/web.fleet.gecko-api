import { describe, it, expect } from 'vitest'
import { driverSchema, DRIVER_STATUS_MAP, REVERSE_STATUS_MAP, NEW_DRIVER_DEFAULTS } from './driver'

describe('driverSchema', () => {
  it('accepts valid minimal driver', () => {
    const result = driverSchema.safeParse({ driverCode: 'DRV-001', driverName: 'John Smith', status: 'ACTIVE' })
    expect(result.success).toBe(true)
  })

  it('rejects empty driverCode', () => {
    const result = driverSchema.safeParse({ driverCode: '', driverName: 'John', status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })

  it('rejects empty driverName', () => {
    const result = driverSchema.safeParse({ driverCode: 'DRV-001', driverName: '', status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = driverSchema.safeParse({ driverCode: 'DRV-001', driverName: 'John', status: 'UNKNOWN' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = driverSchema.safeParse({ driverCode: 'DRV-001', driverName: 'John', status: 'ACTIVE', emailID: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string email', () => {
    const result = driverSchema.safeParse({ driverCode: 'DRV-001', driverName: 'John', status: 'ACTIVE', emailID: '' })
    expect(result.success).toBe(true)
  })

  it('rejects release date before hire date', () => {
    const result = driverSchema.safeParse({
      driverCode: 'DRV-001', driverName: 'John', status: 'ACTIVE',
      dateHire: '2023-01-10', dateRelease: '2023-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('dateRelease')
    }
  })

  it('accepts release date after hire date', () => {
    const result = driverSchema.safeParse({
      driverCode: 'DRV-001', driverName: 'John', status: 'ACTIVE',
      dateHire: '2023-01-01', dateRelease: '2023-01-10',
    })
    expect(result.success).toBe(true)
  })
})

describe('DRIVER_STATUS_MAP', () => {
  it('maps 1 to ACTIVE', () => expect(DRIVER_STATUS_MAP[1]).toBe('ACTIVE'))
  it('maps 2 to INACTIVE', () => expect(DRIVER_STATUS_MAP[2]).toBe('INACTIVE'))
  it('maps 3 to ON LEAVE', () => expect(DRIVER_STATUS_MAP[3]).toBe('ON LEAVE'))
  it('maps 4 to TERMINATED', () => expect(DRIVER_STATUS_MAP[4]).toBe('TERMINATED'))
})

describe('REVERSE_STATUS_MAP', () => {
  it('maps ACTIVE to 1', () => expect(REVERSE_STATUS_MAP['ACTIVE']).toBe(1))
  it('maps TERMINATED to 4', () => expect(REVERSE_STATUS_MAP['TERMINATED']).toBe(4))
})

describe('NEW_DRIVER_DEFAULTS', () => {
  it('has empty driverCode', () => expect(NEW_DRIVER_DEFAULTS.driverCode).toBe(''))
  it('has ACTIVE status', () => expect(NEW_DRIVER_DEFAULTS.status).toBe('ACTIVE'))
})
