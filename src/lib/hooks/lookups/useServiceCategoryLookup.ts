'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

export function useServiceCategoryLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/types/service-type').then(({ SERVICE_CATEGORIES }) => {
      setOptions(SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })))
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
