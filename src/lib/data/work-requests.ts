import type { WorkRequest, WorkRequestSearchCriteria } from '@/types/work-request'
import { getMockWorkRequests } from '@/lib/mock/work-requests'

export async function getWorkRequests(criteria: WorkRequestSearchCriteria): Promise<WorkRequest[]> {
  let results = getMockWorkRequests()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo?.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.orderDate && r.orderDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.orderDate && r.orderDate <= criteria.dateTo!)
  }

  return results
}

export async function getWorkRequest(id: number): Promise<WorkRequest | null> {
  return getMockWorkRequests().find((r) => r.wrID === id) ?? null
}
