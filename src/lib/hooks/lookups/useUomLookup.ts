'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const UOMS = ['EACH', 'SET', 'LITER', 'KG', 'METER', 'PAIR', 'BOX', 'ROLL', 'SHEET']

export function useUomLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(UOMS.map((u) => ({ value: u, label: u })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
