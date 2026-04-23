import type { ServiceType, ServiceTypeSearchCriteria } from '@/types/service-type'
import { getMockServiceTypes } from '@/lib/mock/service-types'

export async function getServiceTypes(criteria: ServiceTypeSearchCriteria): Promise<ServiceType[]> {
  let results = getMockServiceTypes()
  if (criteria.search) {
    const q = criteria.search.toLowerCase()
    results = results.filter((r) => r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }
  if (criteria.category && criteria.category !== 'ALL') results = results.filter((r) => r.serviceCategory === criteria.category)
  return results
}

export async function getServiceType(id: number): Promise<ServiceType | null> {
  return getMockServiceTypes().find((r) => r.serviceTypeID === id) ?? null
}
