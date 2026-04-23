import type { TrafficViolation, TrafficViolationSearchCriteria } from '@/types/traffic-violation'
import { getMockTrafficViolations } from '@/lib/mock/traffic-violations'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getTrafficViolations(
  criteria: TrafficViolationSearchCriteria,
): Promise<TrafficViolation[]> {
  await delay(400)
  let results = getMockTrafficViolations()

  if (criteria.ticketNo) {
    const q = criteria.ticketNo.toLowerCase()
    results = results.filter((r) => r.ticketNo.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode?.toLowerCase().includes(q))
  }

  if (criteria.violationType) {
    results = results.filter((r) => r.violationType === criteria.violationType)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.violationDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.violationDate <= criteria.dateTo!)
  }

  return results
}

export async function getTrafficViolation(id: number): Promise<TrafficViolation | null> {
  await delay(400)
  return getMockTrafficViolations().find((r) => r.violationID === id) ?? null
}
