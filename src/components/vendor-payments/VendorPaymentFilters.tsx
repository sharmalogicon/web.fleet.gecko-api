'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
] as const

interface VendorPaymentFiltersProps {
  receiptNo: string
  vendorName: string
  status: string
  dateFrom: string
  dateTo: string
}

export function VendorPaymentFilters({
  receiptNo,
  vendorName,
  status,
  dateFrom,
  dateTo,
}: VendorPaymentFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      receiptNo?: string
      vendorName?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const rn = params.receiptNo ?? receiptNo
      const vn = params.vendorName ?? vendorName
      const st = params.status ?? status
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (rn) sp.set('receiptNo', rn)
      if (vn) sp.set('vendorName', vn)
      if (st && st !== 'ALL') sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/invoice/vendor-payments?${sp.toString()}`)
    },
    [receiptNo, vendorName, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={receiptNo}
        onChange={(v) => push({ receiptNo: v })}
        placeholder="Search by receipt no…"
        className="w-52"
      />
      <SearchInput
        value={vendorName}
        onChange={(v) => push({ vendorName: v })}
        placeholder="Search by vendor…"
        className="w-52"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.value === 'ALL' ? t('common.all') : s.label}
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
