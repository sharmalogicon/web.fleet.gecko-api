'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

export function useServiceTypeLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/mock/service-types').then(({ getMockServiceTypes }) => {
      setOptions(
        getMockServiceTypes().map((st) => ({
          value: st.serviceTypeID.toString(),
          label: `${st.code} — ${st.description}`,
        }))
      )
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
