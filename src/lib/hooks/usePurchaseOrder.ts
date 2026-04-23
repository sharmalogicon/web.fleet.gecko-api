'use client'
import { useState } from 'react'
import type { PurchaseOrder, PurchaseOrderFormValues } from '@/types/purchase-order'
import { upsertMockPurchaseOrder, removeMockPurchaseOrder } from '@/lib/mock/purchase-orders'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function usePurchaseOrder(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: PurchaseOrderFormValues,
    existing?: PurchaseOrder,
  ): Promise<PurchaseOrder> {
    setIsSaving(true)
    try {
      await delay(400)
      const purchaseOrderID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: PurchaseOrder = {
        ...values,
        purchaseOrderID,
        isApproved: existing?.isApproved ?? false,
        isCancel: existing?.isCancel ?? false,
        lines: existing?.lines ?? [],
      }
      upsertMockPurchaseOrder(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockPurchaseOrder(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
