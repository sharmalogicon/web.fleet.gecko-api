'use client'
import { useState } from 'react'
import type { VendorPayment, VendorPaymentFormValues } from '@/types/vendor-payment'
import { upsertMockVendorPayment, removeMockVendorPayment } from '@/lib/mock/vendor-payments'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useVendorPayment(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  async function save(
    values: VendorPaymentFormValues,
    existing?: VendorPayment,
  ): Promise<VendorPayment> {
    setIsSaving(true)
    try {
      await delay(400)
      const vendorPaymentID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: VendorPayment = {
        ...values,
        vendorPaymentID,
        lines: existing?.lines ?? [],
      }
      upsertMockVendorPayment(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function approve(existing: VendorPayment): Promise<VendorPayment> {
    setIsApproving(true)
    try {
      await delay(400)
      const record: VendorPayment = {
        ...existing,
        isApproved: true,
        approvedBy: 'Current User',
        approvedOn: new Date().toISOString().split('T')[0],
      }
      upsertMockVendorPayment(record)
      return record
    } finally {
      setIsApproving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockVendorPayment(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, isApproving, save, approve, remove }
}
