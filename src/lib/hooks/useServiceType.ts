'use client'
import { useState } from 'react'
import type { ServiceType, ServiceTypeFormValues } from '@/types/service-type'
import { upsertMockServiceType, removeMockServiceType } from '@/lib/mock/service-types'

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

export function useServiceType(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: ServiceTypeFormValues): Promise<ServiceType> {
    setIsSaving(true)
    try {
      await delay(400)
      const record: ServiceType = { ...values, serviceTypeID: id === 'new' ? Date.now() : parseInt(id, 10), branchID: 1 }
      upsertMockServiceType(record)
      return record
    } finally { setIsSaving(false) }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try { await delay(400); removeMockServiceType(parseInt(id, 10)) }
    finally { setIsDeleting(false) }
  }

  return { isSaving, isDeleting, save, remove }
}
