'use client'
import { useState, useEffect } from 'react'
import type { LookupOption } from './types'

export function useEquipmentLookup() {
  const [options, setOptions] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/lib/mock/equipment').then(({ getMockEquipment }) => {
      setOptions(
        getMockEquipment().map((e) => ({
          value: e.equipmentID.toString(),
          label: `${e.code} — ${e.registrationNo ?? ''}`.trim().replace(/—\s*$/, '').trim(),
        }))
      )
      setLoading(false)
    })
  }, [])

  return { options, loading }
}
