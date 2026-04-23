import type { GoodsReceipt, GoodsReceiptSearchCriteria } from '@/types/goods-receipt'
import { getMockGoodsReceipts } from '@/lib/mock/goods-receipts'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getGoodsReceipts(
  criteria: GoodsReceiptSearchCriteria,
): Promise<GoodsReceipt[]> {
  await delay(400)
  let results = getMockGoodsReceipts()

  if (criteria.documentNo) {
    const q = criteria.documentNo.toLowerCase()
    results = results.filter((r) => r.documentNo.toLowerCase().includes(q))
  }

  if (criteria.vendorName) {
    const q = criteria.vendorName.toLowerCase()
    results = results.filter((r) => r.vendorName.toLowerCase().includes(q))
  }

  if (criteria.status && criteria.status !== 'ALL') {
    if (criteria.status === 'RECEIVED') {
      results = results.filter((r) => !r.isCancel)
    } else if (criteria.status === 'CANCELLED') {
      results = results.filter((r) => r.isCancel)
    }
  }

  if (criteria.dateFrom) {
    results = results.filter((r) => r.documentDate >= criteria.dateFrom!)
  }

  if (criteria.dateTo) {
    results = results.filter((r) => r.documentDate <= criteria.dateTo!)
  }

  return results
}

export async function getGoodsReceipt(id: number): Promise<GoodsReceipt | null> {
  await delay(400)
  return getMockGoodsReceipts().find((r) => r.goodsReceiptID === id) ?? null
}
