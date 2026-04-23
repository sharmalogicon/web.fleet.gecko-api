'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const TYPE_OPTIONS = ['ALL', 'INCREASE', 'DECREASE', 'TRANSFER', 'WRITE_OFF'] as const

interface AdjustmentFiltersProps {
  documentNo: string
  adjustmentType: string
  dateFrom: string
  dateTo: string
}

export function AdjustmentFilters({
  documentNo,
  adjustmentType,
  dateFrom,
  dateTo,
}: AdjustmentFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      documentNo?: string
      adjustmentType?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const dn = params.documentNo ?? documentNo
      const at = params.adjustmentType ?? adjustmentType
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (dn) sp.set('documentNo', dn)
      if (at && at !== 'ALL') sp.set('adjustmentType', at)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/goods-adjustments?${sp.toString()}`)
    },
    [documentNo, adjustmentType, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Search by doc no…"
        className="w-52"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Type</label>
        <select
          value={adjustmentType || 'ALL'}
          onChange={(e) => push({ adjustmentType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === 'ALL'
                ? 'All Types'
                : t === 'WRITE_OFF'
                  ? 'Write Off'
                  : t.charAt(0) + t.slice(1).toLowerCase()}
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
