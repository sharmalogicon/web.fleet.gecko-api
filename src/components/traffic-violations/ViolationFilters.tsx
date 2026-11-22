'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'
import { useLookup } from '@/lib/api/fleet/lookups'
import { VIOLATION_STATUSES } from '@/lib/api/fleet/trafficViolations'

interface ViolationFiltersProps {
  ticketNo: string
  equipmentCode: string
  violationType: string
  status: string
  dateFrom: string
  dateTo: string
}

export function ViolationFilters({
  ticketNo,
  equipmentCode,
  violationType,
  status,
  dateFrom,
  dateTo,
}: ViolationFiltersProps) {
  const router = useRouter()
  const { t } = useT()
  const types = useLookup('violation-types')

  const push = useCallback(
    (params: {
      ticketNo?: string
      equipmentCode?: string
      violationType?: string
      status?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      const sp = new URLSearchParams()
      const tn = params.ticketNo ?? ticketNo
      const eq = params.equipmentCode ?? equipmentCode
      const vt = params.violationType ?? violationType
      const st = params.status ?? status
      const df = params.dateFrom ?? dateFrom
      const dt = params.dateTo ?? dateTo
      if (tn) sp.set('ticketNo', tn)
      if (eq) sp.set('equipmentCode', eq)
      if (vt) sp.set('violationType', vt)
      if (st) sp.set('status', st)
      if (df) sp.set('dateFrom', df)
      if (dt) sp.set('dateTo', dt)
      router.push(`/fleet/traffic-violations?${sp.toString()}`)
    },
    [ticketNo, equipmentCode, violationType, status, dateFrom, dateTo, router],
  )

  return (
    <>
      <SearchInput
        value={ticketNo}
        onChange={(v) => push({ ticketNo: v })}
        placeholder="Search by ticket no…"
        className="w-44"
      />
      <SearchInput
        value={equipmentCode}
        onChange={(v) => push({ equipmentCode: v })}
        placeholder="Search by equipment…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Violation Type</label>
        <select
          value={violationType}
          onChange={(e) => push({ violationType: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {types.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('common.all')}</option>
          {VIOLATION_STATUSES.map((s) => <option key={s} value={s}>{t(`violation.status.${s}`)}</option>)}
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
