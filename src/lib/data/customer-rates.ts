import type { CustomerRate, CustomerRateSearchCriteria } from '@/types/customer-rate'
import { getMockCustomerRates } from '@/lib/mock/customer-rates'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getCustomerRates(
  criteria: CustomerRateSearchCriteria,
): Promise<CustomerRate[]> {
  await delay(400)
  let results = getMockCustomerRates()

  if (criteria.quotationNo) {
    const q = criteria.quotationNo.toLowerCase()
    results = results.filter((r) => r.quotationNo.toLowerCase().includes(q))
  }

  if (criteria.customerName) {
    const q = criteria.customerName.toLowerCase()
    results = results.filter((r) => r.customerName?.toLowerCase().includes(q))
  }

  if (criteria.agentCode) {
    const q = criteria.agentCode.toLowerCase()
    results = results.filter((r) => r.agentCode?.toLowerCase().includes(q))
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.quotationDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.quotationDate <= criteria.dateTo!)
  }

  if (criteria.isApproved !== undefined && criteria.isApproved !== 'all') {
    results = results.filter((r) => r.isApproved === criteria.isApproved)
  }

  return results
}

export async function getCustomerRate(id: number): Promise<CustomerRate | null> {
  await delay(400)
  return getMockCustomerRates().find((r) => r.customerRateID === id) ?? null
}
