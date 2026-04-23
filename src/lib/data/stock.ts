import type { StockProfile, StockSearchCriteria } from '@/types/stock'
import { getMockStock } from '@/lib/mock/stock'

export async function getStockList(criteria: StockSearchCriteria): Promise<StockProfile[]> {
  let results = getMockStock()
  if (criteria.search) {
    const q = criteria.search.toLowerCase()
    results = results.filter(
      (r) => r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    )
  }
  if (criteria.category && criteria.category !== 'ALL')
    results = results.filter((r) => r.stockCategory === criteria.category)
  if (criteria.status === 'ACTIVE') results = results.filter((r) => r.isActive)
  else if (criteria.status === 'INACTIVE') results = results.filter((r) => !r.isActive)
  return results
}

export async function getStock(id: number): Promise<StockProfile | null> {
  return getMockStock().find((r) => r.stockID === id) ?? null
}
