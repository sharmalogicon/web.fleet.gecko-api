'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

export function useDriverLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/mock/drivers').then(({ getMockDrivers }) => {
      setOptions(
        getMockDrivers().map((d) => ({
          value: d.driverID.toString(),
          label: `${d.driverName} (${d.driverCode})`,
        }))
      )
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
