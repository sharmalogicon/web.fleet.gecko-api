import type { MeterLog, MeterLogSearchCriteria } from '@/types/meter-log'
import { getMockMeterLogs } from '@/lib/mock/meter-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getMeterLogs(criteria: MeterLogSearchCriteria): Promise<MeterLog[]> {
  await delay(400)
  let results = getMockMeterLogs()

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter(
      (r) =>
        r.equipmentCode?.toLowerCase().includes(q) ||
        r.registrationNo?.toLowerCase().includes(q),
    )
  }

  if (criteria.meterType && criteria.meterType !== 'ALL') {
    results = results.filter((r) => r.meterType === criteria.meterType)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.meterUpdateDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.meterUpdateDate <= criteria.dateTo!)
  }

  return results
}

export async function getMeterLog(id: number): Promise<MeterLog | null> {
  await delay(400)
  return getMockMeterLogs().find((r) => r.meterLogID === id) ?? null
}
