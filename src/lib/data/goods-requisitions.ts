import type { GoodsRequisition, GoodsRequisitionSearchCriteria } from '@/types/goods-requisition'
import { getMockGoodsRequisitions } from '@/lib/mock/goods-requisitions'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getGoodsRequisitions(
  criteria: GoodsRequisitionSearchCriteria,
): Promise<GoodsRequisition[]> {
  await delay(400)
  let results = getMockGoodsRequisitions()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    if (criteria.status === 'APPROVED') {
      results = results.filter((r) => r.isApproved && !r.isCancel)
    } else if (criteria.status === 'CANCELLED') {
      results = results.filter((r) => r.isCancel)
    } else if (criteria.status === 'DRAFT') {
      results = results.filter((r) => !r.isApproved && !r.isCancel)
    }
  }

  return results
}

export async function getGoodsRequisition(id: number): Promise<GoodsRequisition | null> {
  await delay(400)
  return getMockGoodsRequisitions().find((r) => r.requisitionID === id) ?? null
}
