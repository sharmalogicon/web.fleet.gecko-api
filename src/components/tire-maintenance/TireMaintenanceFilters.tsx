'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface TireMaintenanceFiltersProps {
  documentNo: string
  vendorName: string
  dateFrom: string
  dateTo: string
}

export function TireMaintenanceFilters({
  documentNo,
  vendorName,
  dateFrom,
  dateTo,
}: TireMaintenanceFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      documentNo?: string
      vendorName?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const dn = params.documentNo ?? documentNo
      const vn = params.vendorName ?? vendorName
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (dn) sp.set('documentNo', dn)
      if (vn) sp.set('vendorName', vn)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/tires/maintenance?${sp.toString()}`)
    },
    [documentNo, vendorName, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Search by doc no…"
        className="w-44"
      />
      <SearchInput
        value={vendorName}
        onChange={(v) => push({ vendorName: v })}
        placeholder="Search by vendor…"
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
