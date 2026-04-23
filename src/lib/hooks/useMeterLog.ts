'use client'
import { useState } from 'react'
import type { MeterLog, MeterLogFormValues } from '@/types/meter-log'
import { upsertMockMeterLog, removeMockMeterLog } from '@/lib/mock/meter-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useMeterLog(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: MeterLogFormValues): Promise<MeterLog> {
    setIsSaving(true)
    try {
      await delay(400)
      const meterLogID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: MeterLog = {
        ...values,
        meterLogID,
      }
      upsertMockMeterLog(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockMeterLog(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
