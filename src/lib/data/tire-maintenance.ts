import type { TireMaintenance, TireMaintenanceSearchCriteria } from '@/types/tire-maintenance'
import { getMockTireMaintenanceList } from '@/lib/mock/tire-maintenance'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getTireMaintenanceList(
  criteria: TireMaintenanceSearchCriteria,
): Promise<TireMaintenance[]> {
  await delay(400)
  let results = getMockTireMaintenanceList()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode?.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.documentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.documentDate <= criteria.dateTo!)
  }

  return results
}

export async function getTireMaintenance(id: number): Promise<TireMaintenance | null> {
  await delay(400)
  return getMockTireMaintenanceList().find((r) => r.maintenanceID === id) ?? null
}
