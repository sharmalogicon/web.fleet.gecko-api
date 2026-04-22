import { describe, it, expect, beforeEach } from 'vitest'
import { getDrivers, getDriver } from './drivers'
import { getMockDrivers } from '@/lib/mock/drivers'

describe('getDrivers', () => {
  it('returns all drivers when no criteria', async () => {
    const all = await getDrivers({})
    expect(all.length).toBe(getMockDrivers().length)
  })

  it('filters by partial driverName', async () => {
    const results = await getDrivers({ driverName: 'Somchai' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((d) => d.driverName.toLowerCase().includes('somchai'))).toBe(true)
  })

  it('filters by driverCode', async () => {
    const results = await getDrivers({ driverName: 'DRV-001' })
    expect(results.length).toBeGreaterThan(0)
  })

  it('filters by status ACTIVE', async () => {
    const results = await getDrivers({ status: 'ACTIVE' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((d) => d.status === 'ACTIVE')).toBe(true)
  })

  it('returns all when status is ALL', async () => {
    const all = await getDrivers({})
    const withAll = await getDrivers({ status: 'ALL' })
    expect(withAll.length).toBe(all.length)
  })

  it('returns empty array for no match', async () => {
    const results = await getDrivers({ driverName: 'ZZZNOMATCH999' })
    expect(results).toHaveLength(0)
  })
})

describe('getDriver', () => {
  it('returns driver by id', async () => {
    const driver = await getDriver(1)
    expect(driver).not.toBeNull()
    expect(driver?.driverCode).toBe('DRV-001')
  })

  it('returns null for unknown id', async () => {
    const driver = await getDriver(99999)
    expect(driver).toBeNull()
  })
})
