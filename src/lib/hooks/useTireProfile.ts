'use client'
import { useState } from 'react'
import type { TireProfile, TireProfileFormValues } from '@/types/tire-profile'
import { upsertMockTireProfile, removeMockTireProfile } from '@/lib/mock/tire-profiles'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useTireProfile(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: TireProfileFormValues,
    existing?: TireProfile,
  ): Promise<TireProfile> {
    setIsSaving(true)
    try {
      await delay(400)
      const tireProfileID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: TireProfile = {
        ...values,
        tireProfileID,
        timeRecaped: existing?.timeRecaped ?? 0,
        recapCost: existing?.recapCost ?? 0,
        totalInspectionCost: existing?.totalInspectionCost ?? 0,
        totalRepairCost: existing?.totalRepairCost ?? 0,
      }
      upsertMockTireProfile(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockTireProfile(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
