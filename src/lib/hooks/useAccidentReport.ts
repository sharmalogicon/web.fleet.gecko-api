'use client'
import { useState } from 'react'
import type { AccidentReport, AccidentReportFormValues, AccidentImage } from '@/types/accident-report'
import { upsertMockAccidentReport, removeMockAccidentReport } from '@/lib/mock/accident-reports'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useAccidentReport(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: AccidentReportFormValues,
    existingImages?: AccidentImage[],
  ): Promise<AccidentReport> {
    setIsSaving(true)
    try {
      await delay(400)
      const accidentID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: AccidentReport = {
        ...values,
        accidentID,
        images: existingImages ?? [],
      }
      upsertMockAccidentReport(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockAccidentReport(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
