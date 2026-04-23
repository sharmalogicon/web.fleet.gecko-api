'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface WIPInquiryFiltersProps {
  workOrderNo: string
  equipmentCode: string
  customerName: string
  dateFrom: string
  dateTo: string
}

export function WIPInquiryFilters({
  workOrderNo,
  equipmentCode,
  customerName,
  dateFrom,
  dateTo,
}: WIPInquiryFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (overrides: Partial<WIPInquiryFiltersProps>) => {
      const sp = new URLSearchParams()
      const wno = overrides.workOrderNo ?? workOrderNo
      const eq = overrides.equipmentCode ?? equipmentCode
      const cn = overrides.customerName ?? customerName
      const df = overrides.dateFrom ?? dateFrom
      const dt = overrides.dateTo ?? dateTo
      if (wno) sp.set('workOrderNo', wno)
      if (eq) sp.set('equipmentCode', eq)
      if (cn) sp.set('customerName', cn)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/inquiry/wip?${sp.toString()}`)
    },
    [workOrderNo, equipmentCode, customerName, dateFrom, dateTo, router],
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
      <SearchInput
        value={customerName}
        onChange={(v) => push({ customerName: v })}
        placeholder="Customer Name…"
        className="w-48"
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
