'use client'
import { useState } from 'react'
import type { StandardRate, StandardRateFormValues } from '@/types/standard-rate'
import { upsertMockStandardRate, removeMockStandardRate } from '@/lib/mock/standard-rates'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useStandardRate(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: StandardRateFormValues,
    existingLines?: StandardRate['lines'],
    isApproved?: boolean,
  ): Promise<StandardRate> {
    setIsSaving(true)
    try {
      await delay(400)
      const standardRateID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: StandardRate = {
        ...values,
        standardRateID,
        isApproved: isApproved ?? false,
        lines: existingLines ?? [],
      }
      upsertMockStandardRate(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockStandardRate(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
