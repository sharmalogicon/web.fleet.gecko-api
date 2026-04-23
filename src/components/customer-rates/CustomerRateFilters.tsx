'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface CustomerRateFiltersProps {
  quotationNo: string
  customerName: string
  agentCode: string
  status: string
  dateFrom: string
  dateTo: string
}

export function CustomerRateFilters({
  quotationNo,
  customerName,
  agentCode,
  status,
  dateFrom,
  dateTo,
}: CustomerRateFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      quotationNo?: string
      customerName?: string
      agentCode?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const qn = params.quotationNo ?? quotationNo
      const cn = params.customerName ?? customerName
      const ac = params.agentCode ?? agentCode
      const st = params.status ?? status
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (qn) sp.set('quotationNo', qn)
      if (cn) sp.set('customerName', cn)
      if (ac) sp.set('agentCode', ac)
      if (st) sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/tariff/customer-rates?${sp.toString()}`)
    },
    [quotationNo, customerName, agentCode, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={quotationNo}
        onChange={(v) => push({ quotationNo: v })}
        placeholder="Search by quotation no…"
        className="w-44"
      />
      <SearchInput
        value={customerName}
        onChange={(v) => push({ customerName: v })}
        placeholder="Search by customer…"
        className="w-44"
      />
      <SearchInput
        value={agentCode}
        onChange={(v) => push({ agentCode: v })}
        placeholder="Search by agent code…"
        className="w-36"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('common.all')}</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
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
