'use client'
import { useState } from 'react'
import type { WOCreditNote, WOCreditNoteFormValues } from '@/types/wo-credit-note'
import { upsertMockWOCreditNote, removeMockWOCreditNote } from '@/lib/mock/wo-credit-notes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useWOCreditNote(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: WOCreditNoteFormValues,
    existing?: WOCreditNote,
  ): Promise<WOCreditNote> {
    setIsSaving(true)
    try {
      await delay(400)
      const woCreditNoteID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: WOCreditNote = {
        ...values,
        woCreditNoteID,
        status: existing?.status ?? 'ACTIVE',
        lines: existing?.lines ?? [],
      }
      upsertMockWOCreditNote(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockWOCreditNote(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
