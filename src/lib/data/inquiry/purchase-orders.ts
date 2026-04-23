import type { PurchaseOrder } from '@/types/purchase-order'
import { getMockPurchaseOrders } from '@/lib/mock/purchase-orders'

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

export interface POInquiryCriteria {
  documentNo?: string
  vendorName?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export async function getPOInquiry(criteria: POInquiryCriteria): Promise<PurchaseOrder[]> {
  await delay(200)
  let results = getMockPurchaseOrders()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    if (criteria.status === 'Approved') {
      results = results.filter((r) => r.isApproved && !r.isCancel)
    } else if (criteria.status === 'Cancelled') {
      results = results.filter((r) => r.isCancel)
    } else if (criteria.status === 'Draft') {
      results = results.filter((r) => !r.isApproved && !r.isCancel)
    }
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.documentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.documentDate <= criteria.dateTo!)
  }

  return results
}
