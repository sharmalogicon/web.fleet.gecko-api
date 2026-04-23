'use client'

import { useState } from 'react'
import type { PMSchedule, PMSchedulerFormValues } from '@/types/pm-scheduler'
import { upsertMockPMSchedule, removeMockPMSchedule } from '@/lib/mock/pm-scheduler'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function usePMSchedule(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: PMSchedulerFormValues): Promise<PMSchedule> {
    setIsSaving(true)
    try {
      await delay(400)
      const pmID = id === 'new' ? Date.now() : parseInt(id, 10)
      const year = new Date().getFullYear()
      const record: PMSchedule = {
        ...values,
        pmID,
        branchID: 1,
        scheduleNo:
          values.scheduleNo ||
          `PM-${year}-${String(pmID).slice(-3).padStart(3, '0')}`,
      }
      upsertMockPMSchedule(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockPMSchedule(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
