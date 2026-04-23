import type { WOCreditNote, WOCreditNoteSearchCriteria } from '@/types/wo-credit-note'
import { getMockWOCreditNotes } from '@/lib/mock/wo-credit-notes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getWOCreditNotes(
  criteria: WOCreditNoteSearchCriteria,
): Promise<WOCreditNote[]> {
  await delay(400)
  let results = getMockWOCreditNotes()

  if (criteria.creditNoteNo) {
    const q = criteria.creditNoteNo.toLowerCase()
    results = results.filter((r) => r.creditNoteNo.toLowerCase().includes(q))
  }

  if (criteria.customerName) {
    const q = criteria.customerName.toLowerCase()
    results = results.filter((r) => (r.customerName ?? '').toLowerCase().includes(q))
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

export async function getWOCreditNote(id: number): Promise<WOCreditNote | null> {
  await delay(400)
  return getMockWOCreditNotes().find((r) => r.woCreditNoteID === id) ?? null
}
