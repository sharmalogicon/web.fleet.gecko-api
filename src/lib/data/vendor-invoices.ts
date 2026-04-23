import type { VendorInvoice, VendorInvoiceSearchCriteria } from '@/types/vendor-invoice'
import { getMockVendorInvoices } from '@/lib/mock/vendor-invoices'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getVendorInvoices(
  criteria: VendorInvoiceSearchCriteria,
): Promise<VendorInvoice[]> {
  await delay(400)
  let results = getMockVendorInvoices()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.customerName) {
    const q = criteria.customerName.toLowerCase()
    results = results.filter((r) => (r.customerName ?? '').toLowerCase().includes(q))
  }

  if (criteria.vendorInvoiceNo) {
    const q = criteria.vendorInvoiceNo.toLowerCase()
    results = results.filter((r) => (r.vendorInvoiceNo ?? '').toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.documentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.documentDate <= criteria.dateTo!)
  }

  return results
}

export async function getVendorInvoice(id: number): Promise<VendorInvoice | null> {
  await delay(400)
  return getMockVendorInvoices().find((r) => r.vendorInvoiceID === id) ?? null
}
