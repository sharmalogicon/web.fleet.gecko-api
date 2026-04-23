'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = ['ALL', 'OPEN', 'FULFILLED', 'CANCELLED'] as const

interface GoodsRequestFiltersProps {
  reqNo: string
  status: string
  dateFrom: string
  dateTo: string
}

export function GoodsRequestFilters({ reqNo, status, dateFrom, dateTo }: GoodsRequestFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      reqNo?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const rn = params.reqNo ?? reqNo
      const st = params.status ?? status
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (rn) sp.set('reqNo', rn)
      if (st && st !== 'ALL') sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/goods-requests?${sp.toString()}`)
    },
    [reqNo, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={reqNo}
        onChange={(v) => push({ reqNo: v })}
        placeholder="Search by request no…"
        className="w-64"
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
