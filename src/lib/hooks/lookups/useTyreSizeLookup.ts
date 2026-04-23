'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const TYRE_SIZES = [
  '11R22.5',
  '295/80R22.5',
  '275/80R22.5',
  '215/70R15',
  '185/65R15',
  '245/70R19.5',
]

export function useTyreSizeLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(TYRE_SIZES.map((s) => ({ value: s, label: s })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
