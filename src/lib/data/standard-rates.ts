import type { StandardRate, StandardRateSearchCriteria } from '@/types/standard-rate'
import { getMockStandardRates } from '@/lib/mock/standard-rates'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getStandardRates(
  criteria: StandardRateSearchCriteria,
): Promise<StandardRate[]> {
  await delay(400)
  let results = getMockStandardRates()

  if (criteria.rateCode) {
    const q = criteria.rateCode.toLowerCase()
    results = results.filter((r) => r.rateCode.toLowerCase().includes(q))
  }

  if (criteria.description) {
    const q = criteria.description.toLowerCase()
    results = results.filter((r) => r.description?.toLowerCase().includes(q))
  }

  if (criteria.isApproved !== undefined && criteria.isApproved !== 'all') {
    results = results.filter((r) => r.isApproved === criteria.isApproved)
  }

  return results
}

export async function getStandardRate(id: number): Promise<StandardRate | null> {
  await delay(400)
  return getMockStandardRates().find((r) => r.standardRateID === id) ?? null
}
