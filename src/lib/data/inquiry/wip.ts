import type { WorkOrder } from '@/types/work-order'
import { getMockWorkOrders } from '@/lib/mock/work-orders'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export interface WIPInquiryCriteria {
  workOrderNo?: string
  equipmentCode?: string
  customerName?: string
  dateFrom?: string
  dateTo?: string
}

export async function getWIPInquiry(criteria: WIPInquiryCriteria): Promise<WorkOrder[]> {
  await delay(200)
  // WIP = OPEN or IN PROGRESS only
  let results = getMockWorkOrders().filter((r) => r.status === 'OPEN' || r.status === 'IN PROGRESS')

  if (criteria.workOrderNo) {
    const q = criteria.workOrderNo.toLowerCase()
    results = results.filter((r) => r.documentNo?.toLowerCase().includes(q))
  }

  if (criteria.equipmentCode) {
    const q = criteria.equipmentCode.toLowerCase()
    results = results.filter((r) => r.equipmentCode?.toLowerCase().includes(q))
  }

  if (criteria.customerName) {
    const q = criteria.customerName.toLowerCase()
    results = results.filter((r) => r.billingCustomerName?.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.orderDate && r.orderDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.orderDate && r.orderDate <= criteria.dateTo!)
  }

  return results
}
