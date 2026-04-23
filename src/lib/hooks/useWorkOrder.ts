'use client'
import { useState } from 'react'
import type { WorkOrder, WorkOrderFormValues } from '@/types/work-order'
import { upsertMockWorkOrder, removeMockWorkOrder } from '@/lib/mock/work-orders'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useWorkOrder(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: WorkOrderFormValues): Promise<WorkOrder> {
    setIsSaving(true)
    try {
      await delay(400)
      const woID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: WorkOrder = {
        ...values,
        woID,
        branchID: 1,
        documentNo:
          values.documentNo ||
          `WO-${new Date().getFullYear()}-${String(woID).slice(-3).padStart(3, '0')}`,
      }
      upsertMockWorkOrder(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockWorkOrder(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
