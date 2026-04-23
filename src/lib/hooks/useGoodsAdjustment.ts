'use client'
import { useState } from 'react'
import type { GoodsAdjustment, GoodsAdjustmentFormValues } from '@/types/goods-adjustment'
import { upsertMockGoodsAdjustment, removeMockGoodsAdjustment } from '@/lib/mock/goods-adjustments'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useGoodsAdjustment(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: GoodsAdjustmentFormValues,
    existing?: GoodsAdjustment,
  ): Promise<GoodsAdjustment> {
    setIsSaving(true)
    try {
      await delay(400)
      const adjustmentID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: GoodsAdjustment = {
        ...values,
        adjustmentID,
        lines: existing?.lines ?? [],
      }
      upsertMockGoodsAdjustment(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockGoodsAdjustment(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
