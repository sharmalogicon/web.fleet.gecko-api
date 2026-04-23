'use client'
import { useState } from 'react'
import type { TrafficViolation, TrafficViolationFormValues } from '@/types/traffic-violation'
import { upsertMockTrafficViolation, removeMockTrafficViolation } from '@/lib/mock/traffic-violations'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useTrafficViolation(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: TrafficViolationFormValues): Promise<TrafficViolation> {
    setIsSaving(true)
    try {
      await delay(400)
      const violationID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: TrafficViolation = { ...values, violationID }
      upsertMockTrafficViolation(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockTrafficViolation(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
