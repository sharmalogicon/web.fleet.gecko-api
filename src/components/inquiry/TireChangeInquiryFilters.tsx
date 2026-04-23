'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface TireChangeInquiryFiltersProps {
  documentNo: string
  equipmentCode: string
  dateFrom: string
  dateTo: string
}

export function TireChangeInquiryFilters({
  documentNo,
  equipmentCode,
  dateFrom,
  dateTo,
}: TireChangeInquiryFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (overrides: Partial<TireChangeInquiryFiltersProps>) => {
      const sp = new URLSearchParams()
      const dn = overrides.documentNo ?? documentNo
      const eq = overrides.equipmentCode ?? equipmentCode
      const df = overrides.dateFrom ?? dateFrom
      const dt = overrides.dateTo ?? dateTo
      if (dn) sp.set('documentNo', dn)
      if (eq) sp.set('equipmentCode', eq)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/inquiry/tire-changes?${sp.toString()}`)
    },
    [documentNo, equipmentCode, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Document No…"
        className="w-52"
      />
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Equipment Code…"
        className="w-44"
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
