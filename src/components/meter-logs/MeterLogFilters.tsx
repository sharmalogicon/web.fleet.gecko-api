'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const METER_TYPE_OPTIONS = ['ALL', 'KM', 'HOUR', 'BOTH'] as const

interface MeterLogFiltersProps {
  equipmentCode: string
  meterType: string
  dateFrom: string
  dateTo: string
}

export function MeterLogFilters({ equipmentCode, meterType, dateFrom, dateTo }: MeterLogFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      equipmentCode?: string
      meterType?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const eq = params.equipmentCode ?? equipmentCode
      const mt = params.meterType ?? meterType
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (eq) sp.set('equipment', eq)
      if (mt && mt !== 'ALL') sp.set('meterType', mt)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/meter-logs?${sp.toString()}`)
    },
    [equipmentCode, meterType, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Search by equipment or reg no…"
        className="w-64"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Meter Type</label>
        <select
          value={meterType || 'ALL'}
          onChange={(e) => push({ meterType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {METER_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === 'ALL' ? 'All Types' : t}
            </option>
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
