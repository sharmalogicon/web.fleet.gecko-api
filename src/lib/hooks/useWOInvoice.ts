'use client'
import { useState } from 'react'
import type { WOInvoice, WOInvoiceFormValues } from '@/types/wo-invoice'
import { upsertMockWOInvoice, removeMockWOInvoice } from '@/lib/mock/wo-invoices'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useWOInvoice(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: WOInvoiceFormValues,
    existing?: WOInvoice,
  ): Promise<WOInvoice> {
    setIsSaving(true)
    try {
      await delay(400)
      const woInvoiceID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: WOInvoice = {
        ...values,
        woInvoiceID,
        status: existing?.status ?? 'ACTIVE',
        lines: existing?.lines ?? [],
      }
      upsertMockWOInvoice(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockWOInvoice(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
