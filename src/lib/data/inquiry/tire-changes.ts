import type { TireChange } from '@/types/tire-change'
import { getMockTireChanges } from '@/lib/mock/tire-changes'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export interface TireChangeInquiryCriteria {
  documentNo?: string
  equipmentCode?: string
  dateFrom?: string
  dateTo?: string
}

export async function getTireChangeInquiry(criteria: TireChangeInquiryCriteria): Promise<TireChange[]> {
  await delay(200)
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
