'use client'
import { useState } from 'react'
import type { TireChange, TireChangeFormValues, TireChangeLine } from '@/types/tire-change'
import { upsertMockTireChange, removeMockTireChange } from '@/lib/mock/tire-changes'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useTireChange(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: TireChangeFormValues,
    existingLines?: TireChangeLine[],
  ): Promise<TireChange> {
    setIsSaving(true)
    try {
      await delay(400)
      const tireChangeID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: TireChange = {
        ...values,
        tireChangeID,
        lines: existingLines ?? [],
      }
      upsertMockTireChange(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockTireChange(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
