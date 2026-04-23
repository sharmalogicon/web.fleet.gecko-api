import type { TireProfile, TireProfileSearchCriteria } from '@/types/tire-profile'
import { getMockTireProfiles } from '@/lib/mock/tire-profiles'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getTireProfiles(
  criteria: TireProfileSearchCriteria,
): Promise<TireProfile[]> {
  await delay(400)
  let results = getMockTireProfiles()

  if (criteria.serialNo) {
    const q = criteria.serialNo.toLowerCase()
    results = results.filter((r) => r.serialNo.toLowerCase().includes(q))
  }

  if (criteria.brand) {
    const q = criteria.brand.toLowerCase()
    results = results.filter((r) => r.brand.toLowerCase().includes(q))
  }

  if (criteria.tyreStatus && criteria.tyreStatus !== 'ALL') {
    results = results.filter((r) => r.tyreStatus === criteria.tyreStatus)
  }

  if (criteria.isActive && criteria.isActive !== 'ALL') {
    const active = criteria.isActive === 'ACTIVE'
    results = results.filter((r) => r.isActive === active)
  }

  return results
}

export async function getTireProfile(id: number): Promise<TireProfile | null> {
  await delay(400)
  return getMockTireProfiles().find((r) => r.tireProfileID === id) ?? null
}
