'use client'
import { useState } from 'react'
import type { VendorCreditNote, VendorCreditNoteFormValues } from '@/types/vendor-credit-note'
import { upsertMockVendorCreditNote, removeMockVendorCreditNote } from '@/lib/mock/vendor-credit-notes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useVendorCreditNote(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: VendorCreditNoteFormValues,
    existing?: VendorCreditNote,
  ): Promise<VendorCreditNote> {
    setIsSaving(true)
    try {
      await delay(400)
      const vendorCreditNoteID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: VendorCreditNote = {
        ...values,
        vendorCreditNoteID,
        status: existing?.status ?? 'ACTIVE',
        lines: existing?.lines ?? [],
      }
      upsertMockVendorCreditNote(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockVendorCreditNote(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
