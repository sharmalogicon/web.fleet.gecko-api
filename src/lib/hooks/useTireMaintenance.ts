'use client'
import { useState } from 'react'
import type {
  TireMaintenance,
  TireMaintenanceFormValues,
  TireMaintenanceLine,
} from '@/types/tire-maintenance'
import {
  upsertMockTireMaintenance,
  removeMockTireMaintenance,
} from '@/lib/mock/tire-maintenance'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useTireMaintenance(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: TireMaintenanceFormValues,
    existingLines?: TireMaintenanceLine[],
  ): Promise<TireMaintenance> {
    setIsSaving(true)
    try {
      await delay(400)
      const maintenanceID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: TireMaintenance = {
        ...values,
        maintenanceID,
        lines: existingLines ?? [],
      }
      upsertMockTireMaintenance(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockTireMaintenance(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
