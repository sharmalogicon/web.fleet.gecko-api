import type { Driver, DriverSearchCriteria } from '@/types/driver'
import { getMockDrivers } from '@/lib/mock/drivers'

export async function getDrivers(criteria: DriverSearchCriteria): Promise<Driver[]> {
  let results = getMockDrivers()
  if (criteria.driverName) {
    const q = criteria.driverName.toLowerCase()
    results = results.filter(
      (d) =>
        d.driverName.toLowerCase().includes(q) ||
        d.driverCode.toLowerCase().includes(q),
    )
  }
  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((d) => d.status === criteria.status)
  }
  return results
}

export async function getDriver(id: number): Promise<Driver | null> {
  return getMockDrivers().find((d) => d.driverID === id) ?? null
}
