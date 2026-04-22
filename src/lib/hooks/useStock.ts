'use client'

import { useState } from 'react'
import type { StockProfile, StockFormValues } from '@/types/stock'
import { upsertMockStock, removeMockStock } from '@/lib/mock/stock'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useStock(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: StockFormValues): Promise<StockProfile> {
    setIsSaving(true)
    try {
      await delay(400)
      const stock: StockProfile = {
        ...values,
        stockID: id === 'new' ? Date.now() : parseInt(id, 10),
        branchID: 1,
      }
      upsertMockStock(stock)
      return stock
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockStock(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
