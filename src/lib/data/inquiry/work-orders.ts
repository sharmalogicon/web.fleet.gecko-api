import type { WorkOrder } from '@/types/work-order'
import { getMockWorkOrders } from '@/lib/mock/work-orders'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export interface WOInquiryCriteria {
  workOrderNo?: string
  equipmentCode?: string
  woType?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export async function getWOInquiry(criteria: WOInquiryCriteria): Promise<WorkOrder[]> {
  await delay(200)
  let results = getMockWorkOrders()

  if (criteria.workOrderNo) {
    const q = criteria.workOrderNo.toLowerCase()
    results = results.filter((r) => r.documentNo?.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode?.toLowerCase().includes(q))
  }

  if (criteria.woType && criteria.woType !== 'ALL') {
    results = results.filter((r) => r.serviceTypeCategory === criteria.woType)
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
