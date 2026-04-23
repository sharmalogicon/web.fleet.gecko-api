import type { PendingRecap, PendingRecapSearchCriteria } from '@/types/pending-recap'
import { getMockPendingRecap } from '@/lib/mock/pending-recap'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getPendingRecap(
  criteria: PendingRecapSearchCriteria,
): Promise<PendingRecap[]> {
  await delay(400)
  let results = getMockPendingRecap()

  if (criteria.serialNo) {
    const q = criteria.serialNo.toLowerCase()
    results = results.filter((r) => r.serialNo.toLowerCase().includes(q))
  }

  if (criteria.brand) {
    const q = criteria.brand.toLowerCase()
    results = results.filter((r) => r.brand.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  return results
}
