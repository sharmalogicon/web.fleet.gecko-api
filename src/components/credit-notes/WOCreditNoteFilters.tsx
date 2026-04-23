'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'CANCELLED'] as const

interface WOCreditNoteFiltersProps {
  creditNoteNo: string
  customerName: string
  status: string
  dateFrom: string
  dateTo: string
}

export function WOCreditNoteFilters({
  creditNoteNo,
  customerName,
  status,
  dateFrom,
  dateTo,
}: WOCreditNoteFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      creditNoteNo?: string
      customerName?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const cn = params.creditNoteNo ?? creditNoteNo
      const cust = params.customerName ?? customerName
      const st = params.status ?? status
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (cn) sp.set('creditNoteNo', cn)
      if (cust) sp.set('customerName', cust)
      if (st && st !== 'ALL') sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/invoice/credit-notes/wo?${sp.toString()}`)
    },
    [creditNoteNo, customerName, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={creditNoteNo}
        onChange={(v) => push({ creditNoteNo: v })}
        placeholder="Search by credit note no…"
        className="w-52"
      />
      <SearchInput
        value={customerName}
        onChange={(v) => push({ customerName: v })}
        placeholder="Search by customer…"
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
            <option key={s} value={s}>
              {s === 'ALL' ? t('common.all') : s}
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
