import type { InsuranceClaim, InsuranceClaimSearchCriteria } from '@/types/insurance-claim'
import { getMockInsuranceClaims } from '@/lib/mock/insurance-claims'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getInsuranceClaims(
  criteria: InsuranceClaimSearchCriteria,
): Promise<InsuranceClaim[]> {
  await delay(400)
  let results = getMockInsuranceClaims()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.accidentRefNo) {
    const q = criteria.accidentRefNo.toLowerCase()
    results = results.filter((r) => r.accidentRefNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName?.toLowerCase().includes(q))
  }

  if (criteria.claimRefNo) {
    const q = criteria.claimRefNo.toLowerCase()
    results = results.filter((r) => r.claimRefNo?.toLowerCase().includes(q))
  }

  if (criteria.isCancel !== undefined && criteria.isCancel !== 'all') {
    results = results.filter((r) => r.isCancel === criteria.isCancel)
  }

  return results
}

export async function getInsuranceClaim(id: number): Promise<InsuranceClaim | null> {
  await delay(400)
  return getMockInsuranceClaims().find((r) => r.claimID === id) ?? null
}
