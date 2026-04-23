'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const TYRE_BRANDS = ['Michelin', 'Bridgestone', 'Dunlop', 'Continental', 'Goodyear', 'Yokohama', 'Pirelli']

export function useTyreBrandLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(TYRE_BRANDS.map((b) => ({ value: b, label: b })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
