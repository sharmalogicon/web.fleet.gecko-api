'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const EQUIPMENT_CATEGORIES = ['TRUCK', 'TRAILER', 'FORKLIFT', 'CRANE', 'EXCAVATOR', 'OTHER']

export function useEquipmentCategoryLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(EQUIPMENT_CATEGORIES.map((c) => ({ value: c, label: c })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
