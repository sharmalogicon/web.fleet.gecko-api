import type { UnbilledItem, UnbilledSearchCriteria } from '@/types/unbilled-invoice'
import { getMockUnbilledItems } from '@/lib/mock/unbilled-invoices'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getUnbilledItems(
  criteria: UnbilledSearchCriteria,
): Promise<UnbilledItem[]> {
  await delay(400)
  let results = getMockUnbilledItems()

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName.toLowerCase().includes(q))
  }

  if (criteria.poNo) {
    const q = criteria.poNo.toLowerCase()
    results = results.filter((r) => r.poNo.toLowerCase().includes(q))
  }

  if (criteria.grNo) {
    const q = criteria.grNo.toLowerCase()
    results = results.filter((r) => r.grNo.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.orderDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.orderDate <= criteria.dateTo!)
  }

  return results
}
