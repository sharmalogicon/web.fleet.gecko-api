'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const TRIP_TYPES = ['ALL', 'IMPORT', 'EXPORT', 'LOCAL'] as const

interface TruckMovementFiltersProps {
  truckNo: string
  tripType: string
  dateFrom: string
  dateTo: string
}

export function TruckMovementFilters({
  truckNo,
  tripType,
  dateFrom,
  dateTo,
}: TruckMovementFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (overrides: Partial<TruckMovementFiltersProps>) => {
      const sp = new URLSearchParams()
      const tn = overrides.truckNo ?? truckNo
      const tt = overrides.tripType ?? tripType
      const df = overrides.dateFrom ?? dateFrom
      const dt = overrides.dateTo ?? dateTo
      if (tn) sp.set('truckNo', tn)
      if (tt && tt !== 'ALL') sp.set('tripType', tt)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/inquiry/truck-movements?${sp.toString()}`)
    },
    [truckNo, tripType, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={truckNo}
        onChange={(v) => push({ truckNo: v })}
        placeholder="Truck No…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Trip Type</label>
        <select
          value={tripType || 'ALL'}
          onChange={(e) => push({ tripType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TRIP_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.from')}</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => push({ dateFrom: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.to')}</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => push({ dateTo: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  )
}
