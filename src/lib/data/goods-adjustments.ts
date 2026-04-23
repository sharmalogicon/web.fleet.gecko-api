import type { GoodsAdjustment, GoodsAdjustmentSearchCriteria } from '@/types/goods-adjustment'
import { getMockGoodsAdjustments } from '@/lib/mock/goods-adjustments'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getGoodsAdjustments(
  criteria: GoodsAdjustmentSearchCriteria,
): Promise<GoodsAdjustment[]> {
  await delay(400)
  let results = getMockGoodsAdjustments()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.adjustmentType && criteria.adjustmentType !== 'ALL') {
    results = results.filter((r) => r.adjustmentType === criteria.adjustmentType)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.adjustmentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.adjustmentDate <= criteria.dateTo!)
  }

  return results
}

export async function getGoodsAdjustment(id: number): Promise<GoodsAdjustment | null> {
  await delay(400)
  return getMockGoodsAdjustments().find((r) => r.adjustmentID === id) ?? null
}
