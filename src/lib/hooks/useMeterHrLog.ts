'use client'
import { useState } from 'react'
import type { MeterHrLog, MeterHrLogFormValues } from '@/types/meter-hr-log'
import { upsertMockMeterHrLog, removeMockMeterHrLog } from '@/lib/mock/meter-hr-logs'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useMeterHrLog(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: MeterHrLogFormValues): Promise<MeterHrLog> {
    setIsSaving(true)
    try {
      await delay(400)
      const meterHrLogID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: MeterHrLog = {
        ...values,
        meterHrLogID,
      }
      upsertMockMeterHrLog(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockMeterHrLog(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
