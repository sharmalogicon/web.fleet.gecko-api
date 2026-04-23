'use client'

import { useState } from 'react'
import type { Transporter, TransporterFormValues } from '@/types/transporter'
import { upsertMockTransporter, removeMockTransporter } from '@/lib/mock/transporters'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useTransporter(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: TransporterFormValues): Promise<Transporter> {
    setIsSaving(true)
    try {
      await delay(400)
      const transporter: Transporter = {
        ...values,
        transporterID: id === 'new' ? Date.now() : parseInt(id, 10),
        branchID: 1,
      }
      upsertMockTransporter(transporter)
      return transporter
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockTransporter(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
