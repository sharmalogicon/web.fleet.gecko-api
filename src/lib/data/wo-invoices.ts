import type { WOInvoice, WOInvoiceSearchCriteria } from '@/types/wo-invoice'
import { getMockWOInvoices } from '@/lib/mock/wo-invoices'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getWOInvoices(
  criteria: WOInvoiceSearchCriteria,
): Promise<WOInvoice[]> {
  await delay(400)
  let results = getMockWOInvoices()

  if (criteria.receiptNo) {
    const q = criteria.receiptNo.toLowerCase()
    results = results.filter((r) => r.receiptNo.toLowerCase().includes(q))
  }

  if (criteria.customerName) {
    const q = criteria.customerName.toLowerCase()
    results = results.filter((r) => (r.customerName ?? '').toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.cashReceiptDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.cashReceiptDate <= criteria.dateTo!)
  }

  return results
}

export async function getWOInvoice(id: number): Promise<WOInvoice | null> {
  await delay(400)
  return getMockWOInvoices().find((r) => r.woInvoiceID === id) ?? null
}
