'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useT } from '@/i18n/I18nContext'

const WO_STATUSES = [
  'ALL',
  'DRAFT',
  'OPEN',
  'IN PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'INVOICED',
] as const

const WO_CATEGORIES = [
  'ALL',
  'ENGINE',
  'BRAKE',
  'TYRE',
  'ELECTRICAL',
  'PM',
  'INSPECTION',
] as const

interface WorkOrderFiltersProps {
  documentNo: string
  status: string
  serviceTypeCategory: string
  dateFrom: string
  dateTo: string
}

export function WorkOrderFilters({
  documentNo,
  status,
  serviceTypeCategory,
  dateFrom,
  dateTo,
}: WorkOrderFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      documentNo?: string
      status?: string
      serviceTypeCategory?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const doc = params.documentNo ?? documentNo
      const st = params.status ?? status
      const cat = params.serviceTypeCategory ?? serviceTypeCategory
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (doc) sp.set('documentNo', doc)
      if (st && st !== 'ALL') sp.set('status', st)
      if (cat && cat !== 'ALL') sp.set('serviceTypeCategory', cat)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/work-orders?${sp.toString()}`)
    },
    [documentNo, status, serviceTypeCategory, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Search by doc no or equipment…"
        className="w-64"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {WO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('common.all') : s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Category</label>
        <select
          value={serviceTypeCategory || 'ALL'}
          onChange={(e) => push({ serviceTypeCategory: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {WO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c}
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
