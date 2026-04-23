'use client'
import { useState } from 'react'
import type { InsuranceClaim, InsuranceClaimFormValues } from '@/types/insurance-claim'
import { upsertMockInsuranceClaim, removeMockInsuranceClaim } from '@/lib/mock/insurance-claims'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useInsuranceClaim(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: InsuranceClaimFormValues,
    existingLines?: InsuranceClaim['lines'],
  ): Promise<InsuranceClaim> {
    setIsSaving(true)
    try {
      await delay(400)
      const claimID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: InsuranceClaim = {
        ...values,
        claimID,
        lines: existingLines ?? [],
      }
      upsertMockInsuranceClaim(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockInsuranceClaim(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
