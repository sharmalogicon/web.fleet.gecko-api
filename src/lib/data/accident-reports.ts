import type { AccidentReport, AccidentReportSearchCriteria } from '@/types/accident-report'
import { getMockAccidentReports } from '@/lib/mock/accident-reports'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getAccidentReports(
  criteria: AccidentReportSearchCriteria,
): Promise<AccidentReport[]> {
  await delay(400)
  let results = getMockAccidentReports()

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode.toLowerCase().includes(q))
  }

  if (criteria.driverName) {
    const q = criteria.driverName.toLowerCase()
    results = results.filter((r) => r.driverName?.toLowerCase().includes(q))
  }

  if (criteria.accidentType) {
    results = results.filter((r) => r.accidentType === criteria.accidentType)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.accidentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.accidentDate <= criteria.dateTo!)
  }

  return results
}

export async function getAccidentReport(id: number): Promise<AccidentReport | null> {
  await delay(400)
  return getMockAccidentReports().find((r) => r.accidentID === id) ?? null
}
