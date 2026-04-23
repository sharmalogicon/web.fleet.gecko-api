'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const PO_STATUSES = ['ALL', 'Draft', 'Approved', 'Cancelled'] as const

interface POInquiryFiltersProps {
  documentNo: string
  vendorName: string
  status: string
  dateFrom: string
  dateTo: string
}

export function POInquiryFilters({
  documentNo,
  vendorName,
  status,
  dateFrom,
  dateTo,
}: POInquiryFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (overrides: Partial<POInquiryFiltersProps>) => {
      const sp = new URLSearchParams()
      const dn = overrides.documentNo ?? documentNo
      const vn = overrides.vendorName ?? vendorName
      const st = overrides.status ?? status
      const df = overrides.dateFrom ?? dateFrom
      const dt = overrides.dateTo ?? dateTo
      if (dn) sp.set('documentNo', dn)
      if (vn) sp.set('vendorName', vn)
      if (st && st !== 'ALL') sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/inquiry/purchase-orders?${sp.toString()}`)
    },
    [documentNo, vendorName, status, dateFrom, dateTo, router],
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
        value={vendorName}
        onChange={(v) => push({ vendorName: v })}
        placeholder="Vendor Name…"
        className="w-52"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>
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
