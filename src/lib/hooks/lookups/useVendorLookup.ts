'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

const VENDORS = [
  'Bangkok Auto Parts Co.',
  'Thai Parts Supply Ltd.',
  'Siam Tyre Service',
  'BKK Retread Co.',
  'Thai Container Transport',
  'Logicon Fleet Parts',
  'Northern Auto Supply',
  'Eastern Equipment Services',
]

export function useVendorLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptions(VENDORS.map((v, i) => ({ value: (i + 1).toString(), label: v })))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return { options, loading }
}
