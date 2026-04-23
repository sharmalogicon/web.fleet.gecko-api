'use client'
import { useState } from 'react'
import type { ReturnToVendor, ReturnToVendorFormValues } from '@/types/return-to-vendor'
import { upsertMockReturn, removeMockReturn } from '@/lib/mock/return-to-vendor'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useReturnToVendor(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: ReturnToVendorFormValues,
    existing?: ReturnToVendor,
  ): Promise<ReturnToVendor> {
    setIsSaving(true)
    try {
      await delay(400)
      const returnID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: ReturnToVendor = {
        ...values,
        returnID,
        lines: existing?.lines ?? [],
      }
      upsertMockReturn(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockReturn(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
