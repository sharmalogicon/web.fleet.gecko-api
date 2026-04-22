import type { Equipment, EquipmentSearchCriteria } from '@/types/equipment'
import { getMockEquipment } from '@/lib/mock/equipment'

export async function getEquipmentList(criteria: EquipmentSearchCriteria): Promise<Equipment[]> {
  let results = getMockEquipment()
  if (criteria.code) {
    const q = criteria.code.toLowerCase()
    results = results.filter(
      (e) => e.code.toLowerCase().includes(q) || (e.registrationNo?.toLowerCase().includes(q) ?? false),
    )
  }
  if (criteria.category) results = results.filter((e) => e.category === criteria.category)
  if (criteria.status && criteria.status !== 'ALL') results = results.filter((e) => e.status === criteria.status)
  return results
}

export async function getEquipment(id: number): Promise<Equipment | null> {
  return getMockEquipment().find((e) => e.equipmentID === id) ?? null
}
