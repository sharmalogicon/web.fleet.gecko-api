'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const WO_TYPES = ['ALL', 'REPAIR', 'SERVICE', 'INSPECTION'] as const
const WO_STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED'] as const

interface WOInquiryFiltersProps {
  workOrderNo: string
  equipmentCode: string
  woType: string
  status: string
  dateFrom: string
  dateTo: string
}

export function WOInquiryFilters({
  workOrderNo,
  equipmentCode,
  woType,
  status,
  dateFrom,
  dateTo,
}: WOInquiryFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (overrides: Partial<WOInquiryFiltersProps>) => {
      const sp = new URLSearchParams()
      const wno = overrides.workOrderNo ?? workOrderNo
      const eq = overrides.equipmentCode ?? equipmentCode
      const wt = overrides.woType ?? woType
      const st = overrides.status ?? status
      const df = overrides.dateFrom ?? dateFrom
      const dt = overrides.dateTo ?? dateTo
      if (wno) sp.set('workOrderNo', wno)
      if (eq) sp.set('equipmentCode', eq)
      if (wt && wt !== 'ALL') sp.set('woType', wt)
      if (st && st !== 'ALL') sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/inquiry/work-orders?${sp.toString()}`)
    },
    [workOrderNo, equipmentCode, woType, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={workOrderNo}
        onChange={(v) => push({ workOrderNo: v })}
        placeholder="Work Order No…"
        className="w-52"
      />
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Equipment Code…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Type</label>
        <select
          value={woType || 'ALL'}
          onChange={(e) => push({ woType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {WO_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {WO_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s.replace('_', ' ')}</option>
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
