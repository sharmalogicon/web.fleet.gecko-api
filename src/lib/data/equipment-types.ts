import type { EquipmentTypeRecord, EquipmentTypeSearchCriteria } from '@/types/equipment-type'
import { getMockEquipmentTypes } from '@/lib/mock/equipment-types'

export async function getEquipmentTypes(criteria: EquipmentTypeSearchCriteria): Promise<EquipmentTypeRecord[]> {
  let results = getMockEquipmentTypes()
  if (criteria.search) {
    const q = criteria.search.toLowerCase()
    results = results.filter(
      (r) =>
        r.equipmentTypeSize.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.isoCode?.toLowerCase().includes(q),
    )
  }
  return results
}

export async function getEquipmentType(id: number): Promise<EquipmentTypeRecord | null> {
  return getMockEquipmentTypes().find((r) => r.equipmentTypeSizeID === id) ?? null
}
