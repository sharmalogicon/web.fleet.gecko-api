import type { PurchaseOrder, PurchaseOrderSearchCriteria } from '@/types/purchase-order'
import { getMockPurchaseOrders } from '@/lib/mock/purchase-orders'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getPurchaseOrders(
  criteria: PurchaseOrderSearchCriteria,
): Promise<PurchaseOrder[]> {
  await delay(400)
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
    if (criteria.status === 'APPROVED') {
      results = results.filter((r) => r.isApproved && !r.isCancel)
    } else if (criteria.status === 'CANCELLED') {
      results = results.filter((r) => r.isCancel)
    } else if (criteria.status === 'DRAFT') {
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

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder | null> {
  await delay(400)
  return getMockPurchaseOrders().find((r) => r.purchaseOrderID === id) ?? null
}
