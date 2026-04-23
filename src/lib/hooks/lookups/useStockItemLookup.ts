'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

export function useStockItemLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/mock/stock').then(({ getMockStock }) => {
      setOptions(
        getMockStock().map((s) => ({
          value: s.stockID.toString(),
          label: `${s.code} — ${s.description}`,
        }))
      )
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
