'use client'
import { useState } from 'react'
import type { CustomerRate, CustomerRateFormValues } from '@/types/customer-rate'
import { upsertMockCustomerRate, removeMockCustomerRate } from '@/lib/mock/customer-rates'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useCustomerRate(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(
    values: CustomerRateFormValues,
    existingLines?: CustomerRate['lines'],
    isApproved?: boolean,
  ): Promise<CustomerRate> {
    setIsSaving(true)
    try {
      await delay(400)
      const customerRateID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: CustomerRate = {
        ...values,
        customerRateID,
        isApproved: isApproved ?? false,
        lines: existingLines ?? [],
      }
      upsertMockCustomerRate(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockCustomerRate(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
