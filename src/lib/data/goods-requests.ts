import type { GoodsRequest, GoodsRequestSearchCriteria } from '@/types/goods-request'
import { getMockGoodsRequests } from '@/lib/mock/goods-requests'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getGoodsRequests(criteria: GoodsRequestSearchCriteria): Promise<GoodsRequest[]> {
  await delay(400)
  let results = getMockGoodsRequests()

  if (criteria.reqNo) {
    const q = criteria.reqNo.toLowerCase()
    results = results.filter((r) => r.reqNo.toLowerCase().includes(q))
  }

  if (criteria.workOrderNo) {
    const q = criteria.workOrderNo.toLowerCase()
    results = results.filter((r) => r.workOrderNo?.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    results = results.filter((r) => r.status === criteria.status)
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.reqDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.reqDate <= criteria.dateTo!)
  }

  return results
}

export async function getGoodsRequest(id: number): Promise<GoodsRequest | null> {
  await delay(400)
  return getMockGoodsRequests().find((r) => r.goodsRequestID === id) ?? null
}
