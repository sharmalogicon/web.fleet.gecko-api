'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const

interface SparePartsMonitorFiltersProps {
  workOrderNo: string
  equipmentCode: string
  status: string
}

export function SparePartsMonitorFilters({
  workOrderNo,
  equipmentCode,
  status,
}: SparePartsMonitorFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      workOrderNo?: string
      equipmentCode?: string
      status?: string
    }) => {
      const sp = new URLSearchParams()
      const wo = params.workOrderNo ?? workOrderNo
      const eq = params.equipmentCode ?? equipmentCode
      const st = params.status ?? status
      if (wo) sp.set('workOrderNo', wo)
      if (eq) sp.set('equipmentCode', eq)
      if (st && st !== 'ALL') sp.set('status', st)
      router.push(`/fleet/spare-parts/monitoring?${sp.toString()}`)
    },
    [workOrderNo, equipmentCode, status, router],
  )

  return (
    <>
      <SearchInput
        value={workOrderNo}
        onChange={(v) => push({ workOrderNo: v })}
        placeholder="Search by WO no…"
        className="w-48"
      />
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Search by equipment…"
        className="w-48"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('common.all') : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
