'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useT } from '@/i18n/I18nContext'
import { useBranchContext } from '@/lib/api/platform/branches'

const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE', 'ON LEAVE', 'TERMINATED'] as const

interface DriverFiltersProps {
  name: string
  status: string
  branch: string
}

export function DriverFilters({ name, status, branch }: DriverFiltersProps) {
  const router = useRouter()
  const { t } = useT()
  const { branches } = useBranchContext()

  const push = useCallback(
    (params: { name?: string; status?: string; branch?: string }) => {
      const sp = new URLSearchParams()
      const n = params.name ?? name
      const s = params.status ?? status
      const b = params.branch ?? branch
      if (n) sp.set('name', n)
      if (s && s !== 'ALL') sp.set('status', s)
      if (b && b !== 'ALL') sp.set('branch', b)
      router.push(`/master/drivers?${sp.toString()}`)
    },
    [name, status, branch, router],
  )

  return (
    <>
      <SearchInput
        value={name}
        onChange={(v) => push({ name: v })}
        placeholder="Search by name or code…"
        className="w-64"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('technician.branch')}</label>
        <select
          value={branch || 'ALL'}
          onChange={(e) => push({ branch: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">{t('common.all')}</option>
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>{b.branchCode} · {b.displayName}</option>
          ))}
        </select>
      </div>
    </>
  )
}
