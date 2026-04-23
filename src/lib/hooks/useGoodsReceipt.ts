'use client'
import { useState } from 'react'
import type { GoodsReceipt, GoodsReceiptFormValues } from '@/types/goods-receipt'
import { upsertMockGoodsReceipt, removeMockGoodsReceipt } from '@/lib/mock/goods-receipts'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useGoodsReceipt(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: GoodsReceiptFormValues,
    existing?: GoodsReceipt,
  ): Promise<GoodsReceipt> {
    setIsSaving(true)
    try {
      await delay(400)
      const goodsReceiptID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: GoodsReceipt = {
        ...values,
        goodsReceiptID,
        isCancel: existing?.isCancel ?? false,
        lines: existing?.lines ?? [],
      }
      upsertMockGoodsReceipt(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockGoodsReceipt(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
