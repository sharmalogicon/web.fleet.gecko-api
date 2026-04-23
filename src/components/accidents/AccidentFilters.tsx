'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'
import type { AccidentType } from '@/types/accident-report'

const ACCIDENT_TYPES: AccidentType[] = ['COLLISION', 'ROLLOVER', 'FIRE', 'THEFT', 'OTHER']

interface AccidentFiltersProps {
  equipmentCode: string
  driverName: string
  accidentType: string
  dateFrom: string
  dateTo: string
}

export function AccidentFilters({
  equipmentCode,
  driverName,
  accidentType,
  dateFrom,
  dateTo,
}: AccidentFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      equipmentCode?: string
      driverName?: string
      accidentType?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const eq = params.equipmentCode ?? equipmentCode
      const dn = params.driverName ?? driverName
      const at = params.accidentType ?? accidentType
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (eq) sp.set('equipmentCode', eq)
      if (dn) sp.set('driverName', dn)
      if (at) sp.set('accidentType', at)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/accidents?${sp.toString()}`)
    },
    [equipmentCode, driverName, accidentType, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Search by equipment…"
        className="w-44"
      />
      <SearchInput
        value={driverName}
        onChange={(v) => push({ driverName: v })}
        placeholder="Search by driver…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Type</label>
        <select
          value={accidentType}
          onChange={(e) => push({ accidentType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {ACCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
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
