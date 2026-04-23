import type { WorkOrder, WorkOrderSearchCriteria } from '@/types/work-order'
import { getMockWorkOrders } from '@/lib/mock/work-orders'

export async function getWorkOrders(criteria: WorkOrderSearchCriteria): Promise<WorkOrder[]> {
  let results = getMockWorkOrders()
  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter(
      (r) =>
        r.documentNo?.toLowerCase().includes(q) ||
        r.equipmentCode?.toLowerCase().includes(q),
    )
  }
  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }
  if (criteria.equipmentCode) {
    results = results.filter((r) =>
      r.equipmentCode?.toLowerCase().includes(criteria.equipmentCode!.toLowerCase()),
    )
  }
  if (criteria.serviceTypeCategory && criteria.serviceTypeCategory !== 'ALL') {
    results = results.filter((r) => r.serviceTypeCategory === criteria.serviceTypeCategory)
  }
  if (criteria.dateFrom) {
    results = results.filter((r) => r.orderDate && r.orderDate >= criteria.dateFrom!)
  }
  if (criteria.dateTo) {
    results = results.filter((r) => r.orderDate && r.orderDate <= criteria.dateTo!)
  }
  return results
}

export async function getWorkOrder(id: number): Promise<WorkOrder | null> {
  return getMockWorkOrders().find((r) => r.woID === id) ?? null
}
