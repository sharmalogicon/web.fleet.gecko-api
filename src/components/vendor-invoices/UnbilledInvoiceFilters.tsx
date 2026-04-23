'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface UnbilledInvoiceFiltersProps {
  vendorName: string
  poNo: string
  grNo: string
  dateFrom: string
  dateTo: string
}

export function UnbilledInvoiceFilters({
  vendorName,
  poNo,
  grNo,
  dateFrom,
  dateTo,
}: UnbilledInvoiceFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      vendorName?: string
      poNo?: string
      grNo?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const vn = params.vendorName ?? vendorName
      const po = params.poNo ?? poNo
      const gr = params.grNo ?? grNo
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (vn) sp.set('vendorName', vn)
      if (po) sp.set('poNo', po)
      if (gr) sp.set('grNo', gr)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/invoice/vendor/unbilled?${sp.toString()}`)
    },
    [vendorName, poNo, grNo, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={vendorName}
        onChange={(v) => push({ vendorName: v })}
        placeholder="Search by vendor…"
        className="w-52"
      />
      <SearchInput
        value={poNo}
        onChange={(v) => push({ poNo: v })}
        placeholder="Search by PO no…"
        className="w-44"
      />
      <SearchInput
        value={grNo}
        onChange={(v) => push({ grNo: v })}
        placeholder="Search by GR no…"
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
