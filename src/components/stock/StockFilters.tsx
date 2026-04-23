'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useT } from '@/i18n/I18nContext'

const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE'] as const
const CATEGORIES = ['ALL', 'PARTS', 'LUBRICANT', 'CONSUMABLE', 'TYRE'] as const

interface StockFiltersProps {
  search: string
  status: string
  category: string
}

export function StockFilters({ search, status, category }: StockFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: { search?: string; status?: string; category?: string }) => {
      const sp = new URLSearchParams()
      const s = params.search ?? search
      const st = params.status ?? status
      const cat = params.category ?? category
      if (s) sp.set('search', s)
      if (st && st !== 'ALL') sp.set('status', st)
      if (cat && cat !== 'ALL') sp.set('category', cat)
      router.push(`/master/stock?${sp.toString()}`)
    },
    [search, status, category, router],
  )

  return (
    <>
      <SearchInput
        value={search}
        onChange={(v) => push({ search: v })}
        placeholder="Search by code or description…"
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
