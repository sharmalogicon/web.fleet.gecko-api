'use client'
import { useState } from 'react'
import type { GoodsRequisition, GoodsRequisitionFormValues } from '@/types/goods-requisition'
import { upsertMockGoodsRequisition, removeMockGoodsRequisition } from '@/lib/mock/goods-requisitions'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useGoodsRequisition(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: GoodsRequisitionFormValues,
    existing?: GoodsRequisition,
  ): Promise<GoodsRequisition> {
    setIsSaving(true)
    try {
      await delay(400)
      const requisitionID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: GoodsRequisition = {
        ...values,
        requisitionID,
        isApproved: existing?.isApproved ?? false,
        isCancel: existing?.isCancel ?? false,
        lines: existing?.lines ?? [],
      }
      upsertMockGoodsRequisition(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockGoodsRequisition(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
