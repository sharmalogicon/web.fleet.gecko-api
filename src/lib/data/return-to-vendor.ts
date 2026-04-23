import type { ReturnToVendor, ReturnToVendorSearchCriteria } from '@/types/return-to-vendor'
import { getMockReturns } from '@/lib/mock/return-to-vendor'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getReturns(
  criteria: ReturnToVendorSearchCriteria,
): Promise<ReturnToVendor[]> {
  await delay(400)
  let results = getMockReturns()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.returnDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.returnDate <= criteria.dateTo!)
  }

  return results
}

export async function getReturn(id: number): Promise<ReturnToVendor | null> {
  await delay(400)
  return getMockReturns().find((r) => r.returnID === id) ?? null
}
