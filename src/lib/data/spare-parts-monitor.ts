import type { SparePartsMonitor, SparePartsMonitorSearchCriteria } from '@/types/spare-parts-monitor'
import { getMockSparePartsMonitor } from '@/lib/mock/spare-parts-monitor'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getSparePartsMonitor(
  criteria: SparePartsMonitorSearchCriteria,
): Promise<SparePartsMonitor[]> {
  await delay(400)
  let results = getMockSparePartsMonitor()

  if (criteria.workOrderNo) {
    const q = criteria.workOrderNo.toLowerCase()
    results = results.filter((r) => r.workOrderNo.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  return results
}
