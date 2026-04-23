'use client'
import { useState } from 'react'
import type { VendorInvoice, VendorInvoiceFormValues } from '@/types/vendor-invoice'
import { upsertMockVendorInvoice, removeMockVendorInvoice } from '@/lib/mock/vendor-invoices'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useVendorInvoice(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: VendorInvoiceFormValues,
    existing?: VendorInvoice,
  ): Promise<VendorInvoice> {
    setIsSaving(true)
    try {
      await delay(400)
      const vendorInvoiceID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: VendorInvoice = {
        ...values,
        vendorInvoiceID,
        status: existing?.status ?? 'ACTIVE',
        lines: existing?.lines ?? [],
      }
      upsertMockVendorInvoice(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockVendorInvoice(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
