'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useT } from '@/i18n/I18nContext'

const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE', 'UNDER REPAIR', 'DISPOSED'] as const
const CATEGORIES = ['ALL', 'TRUCK', 'TRAILER', 'FORKLIFT', 'PICKUP'] as const

interface EquipmentFiltersProps {
  code: string
  status: string
  category: string
}

export function EquipmentFilters({ code, status, category }: EquipmentFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: { code?: string; status?: string; category?: string }) => {
      const sp = new URLSearchParams()
      const c = params.code ?? code
      const s = params.status ?? status
      const cat = params.category ?? category
      if (c) sp.set('code', c)
      if (s && s !== 'ALL') sp.set('status', s)
      if (cat && cat !== 'ALL') sp.set('category', cat)
      router.push(`/master/equipment?${sp.toString()}`)
    },
    [code, status, category, router],
  )

  return (
    <>
      <SearchInput
        value={code}
        onChange={(v) => push({ code: v })}
        placeholder="Search by code or reg. no…"
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
            <option key={s} value={s}>
              {s === 'ALL' ? t('common.all') : s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Category</label>
        <select
          value={category || 'ALL'}
          onChange={(e) => push({ category: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
