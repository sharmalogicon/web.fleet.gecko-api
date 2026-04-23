'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface MeterHrLogFiltersProps {
  equipmentCode: string
  dateFrom: string
  dateTo: string
}

export function MeterHrLogFilters({ equipmentCode, dateFrom, dateTo }: MeterHrLogFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      equipmentCode?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const eq = params.equipmentCode ?? equipmentCode
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (eq) sp.set('equipment', eq)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/meter-hr-logs?${sp.toString()}`)
    },
    [equipmentCode, dateFrom, dateTo, router],
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
