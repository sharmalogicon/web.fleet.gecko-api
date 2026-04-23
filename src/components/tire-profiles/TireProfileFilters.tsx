'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = ['ALL', 'NEW', 'USED', 'RECAP', 'SCRAP'] as const
const ACTIVE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
] as const

interface TireProfileFiltersProps {
  serialNo: string
  brand: string
  tyreStatus: string
  isActive: string
}

export function TireProfileFilters({
  serialNo,
  brand,
  tyreStatus,
  isActive,
}: TireProfileFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      serialNo?: string
      brand?: string
      tyreStatus?: string
      isActive?: string
    }) => {
      const sp = new URLSearchParams()
      const sn = params.serialNo ?? serialNo
      const br = params.brand ?? brand
      const ts = params.tyreStatus ?? tyreStatus
      const ia = params.isActive ?? isActive
      if (sn) sp.set('serialNo', sn)
      if (br) sp.set('brand', br)
      if (ts && ts !== 'ALL') sp.set('tyreStatus', ts)
      if (ia && ia !== 'ALL') sp.set('isActive', ia)
      router.push(`/fleet/tires/profiles?${sp.toString()}`)
    },
    [serialNo, brand, tyreStatus, isActive, router],
  )

  return (
    <>
      <SearchInput
        value={serialNo}
        onChange={(v) => push({ serialNo: v })}
        placeholder="Search by serial no…"
        className="w-48"
      />
      <SearchInput
        value={brand}
        onChange={(v) => push({ brand: v })}
        placeholder="Search by brand…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={tyreStatus || 'ALL'}
          onChange={(e) => push({ tyreStatus: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('common.all') : s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Active</label>
        <select
          value={isActive || 'ALL'}
          onChange={(e) => push({ isActive: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ACTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
