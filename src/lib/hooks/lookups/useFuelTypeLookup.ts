'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const FUEL_TYPES = ['DIESEL', 'GASOLINE', 'LPG', 'ELECTRIC']

export function useFuelTypeLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(FUEL_TYPES.map((f) => ({ value: f, label: f })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
