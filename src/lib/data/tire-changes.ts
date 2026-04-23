import type { TireChange, TireChangeSearchCriteria } from '@/types/tire-change'
import { getMockTireChanges } from '@/lib/mock/tire-changes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getTireChanges(criteria: TireChangeSearchCriteria): Promise<TireChange[]> {
  await delay(400)
  let results = getMockTireChanges()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.changeDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.changeDate <= criteria.dateTo!)
  }

  return results
}

export async function getTireChange(id: number): Promise<TireChange | null> {
  await delay(400)
  return getMockTireChanges().find((r) => r.tireChangeID === id) ?? null
}
