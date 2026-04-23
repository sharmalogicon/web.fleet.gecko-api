import type { FuelLog, FuelLogSearchCriteria } from '@/types/fuel-log'
import { getMockFuelLogs } from '@/lib/mock/fuel-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getFuelLogs(criteria: FuelLogSearchCriteria): Promise<FuelLog[]> {
  await delay(400)
  let results = getMockFuelLogs()

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter(
      (r) =>
        r.equipmentCode?.toLowerCase().includes(q) ||
        r.registrationNo?.toLowerCase().includes(q),
    )
  }

  if (criteria.driverName) {
    const q = criteria.driverName.toLowerCase()
    results = results.filter((r) => r.driverName?.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.meterUpdateDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.meterUpdateDate <= criteria.dateTo!)
  }

  if (criteria.status && criteria.status !== 'ALL') {
    const approved = criteria.status === 'APPROVED'
    results = results.filter((r) => r.isApproved === approved)
  }

  return results
}

export async function getFuelLog(id: number): Promise<FuelLog | null> {
  await delay(400)
  return getMockFuelLogs().find((r) => r.fuelLogID === id) ?? null
}
