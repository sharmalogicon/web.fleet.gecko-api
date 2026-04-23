'use client'
import { useState } from 'react'
import type { FuelLog, FuelLogFormValues } from '@/types/fuel-log'
import { upsertMockFuelLog, removeMockFuelLog } from '@/lib/mock/fuel-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useFuelLog(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: FuelLogFormValues): Promise<FuelLog> {
    setIsSaving(true)
    try {
      await delay(400)
      const fuelLogID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: FuelLog = {
        ...values,
        fuelLogID,
        isApproved: false,
      }
      upsertMockFuelLog(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockFuelLog(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
