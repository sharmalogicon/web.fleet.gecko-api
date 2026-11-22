'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useT } from '@/i18n/I18nContext'
import { FLEET_TRADE, useCodeList } from '@/lib/api/fleet/setup'
import { useBranchContext } from '@/lib/api/platform/branches'
import { TECHNICIAN_STATUSES } from '@/types/technician'

interface Props {
  search: string
  trade: string
  status: string
  branch: string
}

const selectClass =
  'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Same filter bar as Drivers, plus trade and branch (prompt 04). */
export function TechnicianFilters({ search, trade, status, branch }: Props) {
  const router = useRouter()
  const { t, lang } = useT()
  const trades = useCodeList(FLEET_TRADE)
  const { branches } = useBranchContext()

  const push = useCallback(
    (p: Partial<Props>) => {
      const next = { search, trade, status, branch, ...p }
      const sp = new URLSearchParams()
      if (next.search) sp.set('search', next.search)
      if (next.trade && next.trade !== 'ALL') sp.set('trade', next.trade)
      if (next.status && next.status !== 'ALL') sp.set('status', next.status)
      if (next.branch && next.branch !== 'ALL') sp.set('branch', next.branch)
      router.push(`/master/technicians?${sp.toString()}`)
    },
    [search, trade, status, branch, router],
  )

  return (
    <>
      <SearchInput value={search} onChange={(v) => push({ search: v })} placeholder={t('technician.searchPlaceholder')} className="w-64" />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('technician.trade')}</label>
        <select value={trade || 'ALL'} onChange={(e) => push({ trade: e.target.value })} className={selectClass}>
          <option value="ALL">{t('common.all')}</option>
          {trades.data?.filter((x) => x.isActive).map((x) => (
            <option key={x.code} value={x.code}>{lang === 'th' && x.descriptionLocal ? x.descriptionLocal : x.descriptionEn}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select value={status || 'ALL'} onChange={(e) => push({ status: e.target.value })} className={selectClass}>
          {['ALL', ...TECHNICIAN_STATUSES].map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('technician.branch')}</label>
        <select value={branch || 'ALL'} onChange={(e) => push({ branch: e.target.value })} className={selectClass}>
          <option value="ALL">{t('common.all')}</option>
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>
          ))}
        </select>
      </div>
    </>
  )
}
