import type { VendorCreditNote, VendorCreditNoteSearchCriteria } from '@/types/vendor-credit-note'
import { getMockVendorCreditNotes } from '@/lib/mock/vendor-credit-notes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getVendorCreditNotes(
  criteria: VendorCreditNoteSearchCriteria,
): Promise<VendorCreditNote[]> {
  await delay(400)
  let results = getMockVendorCreditNotes()

  if (criteria.creditNoteNo) {
    const q = criteria.creditNoteNo.toLowerCase()
    results = results.filter((r) => r.creditNoteNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => (r.vendorName ?? '').toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.creditNoteDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.creditNoteDate <= criteria.dateTo!)
  }

  return results
}

export async function getVendorCreditNote(id: number): Promise<VendorCreditNote | null> {
  await delay(400)
  return getMockVendorCreditNotes().find((r) => r.vendorCreditNoteID === id) ?? null
}
