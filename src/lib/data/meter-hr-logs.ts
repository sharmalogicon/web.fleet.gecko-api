import type { MeterHrLog, MeterHrLogSearchCriteria } from '@/types/meter-hr-log'
import { getMockMeterHrLogs } from '@/lib/mock/meter-hr-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getMeterHrLogs(criteria: MeterHrLogSearchCriteria): Promise<MeterHrLog[]> {
  await delay(400)
  let results = getMockMeterHrLogs()

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter(
      (r) =>
        r.equipmentCode?.toLowerCase().includes(q) ||
        r.registrationNo?.toLowerCase().includes(q),
    )
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.meterUpdateDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.meterUpdateDate <= criteria.dateTo!)
  }

  return results
}

export async function getMeterHrLog(id: number): Promise<MeterHrLog | null> {
  await delay(400)
  return getMockMeterHrLogs().find((r) => r.meterHrLogID === id) ?? null
}
