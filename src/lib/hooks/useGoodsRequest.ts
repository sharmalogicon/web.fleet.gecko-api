'use client'
import { useState } from 'react'
import type { GoodsRequest, GoodsRequestFormValues } from '@/types/goods-request'
import { upsertMockGoodsRequest, removeMockGoodsRequest } from '@/lib/mock/goods-requests'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function useGoodsRequest(id: string) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function save(values: GoodsRequestFormValues): Promise<GoodsRequest> {
    setIsSaving(true)
    try {
      await delay(400)
      const goodsRequestID = id === 'new' ? Date.now() : parseInt(id, 10)
      const record: GoodsRequest = { ...values, goodsRequestID }
      upsertMockGoodsRequest(record)
      return record
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true)
    try {
      await delay(400)
      removeMockGoodsRequest(parseInt(id, 10))
    } finally {
      setIsDeleting(false)
    }
  }

  return { isSaving, isDeleting, save, remove }
}
