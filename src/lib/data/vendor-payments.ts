import type { VendorPayment, VendorPaymentSearchCriteria } from '@/types/vendor-payment'
import { getMockVendorPayments } from '@/lib/mock/vendor-payments'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getVendorPayments(
  criteria: VendorPaymentSearchCriteria,
): Promise<VendorPayment[]> {
  await delay(400)
  let results = getMockVendorPayments()

  if (criteria.receiptNo) {
    const q = criteria.receiptNo.toLowerCase()
    results = results.filter((r) => r.receiptNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => (r.vendorName ?? '').toLowerCase().includes(q))
  }

  if (criteria.isApproved !== undefined && criteria.isApproved !== 'ALL') {
    results = results.filter((r) => r.isApproved === criteria.isApproved)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.receiptDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.receiptDate <= criteria.dateTo!)
  }

  return results
}

export async function getVendorPayment(id: number): Promise<VendorPayment | null> {
  await delay(400)
  return getMockVendorPayments().find((r) => r.vendorPaymentID === id) ?? null
}
