'use client'
import { useState } from 'react'
import type { WorkRequest, WorkRequestFormValues } from '@/types/work-request'
import { upsertMockWorkRequest, removeMockWorkRequest } from '@/lib/mock/work-requests'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useWorkRequest(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: WorkRequestFormValues): Promise<WorkRequest> {
    setIsSaving(true)
    try {
      await delay(400)
      const wrID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: WorkRequest = {
        ...values,
        wrID,
        branchID: 1,
        documentNo:
          values.documentNo ||
          `WR-${new Date().getFullYear()}-${String(wrID).slice(-3).padStart(3, '0')}`,
      }
      upsertMockWorkRequest(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockWorkRequest(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
