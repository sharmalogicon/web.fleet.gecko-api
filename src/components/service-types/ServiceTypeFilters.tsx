'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useCodeList } from '@/lib/api/fleet/setup'
import { SERVICE_CATEGORY_LIST } from '@/lib/api/fleet/serviceTasks'
import { useT } from '@/i18n/I18nContext'

interface ServiceTypeFiltersProps {
  search: string
  category: string
}

export function ServiceTypeFilters({ search, category }: ServiceTypeFiltersProps) {
  const router = useRouter()
  const { t } = useT()
  // Options from the Platform code list (FLEET_SERVICE_CATEGORY), not a constant.
  const categories = useCodeList(SERVICE_CATEGORY_LIST)

  const push = useCallback(
    (params: { search?: string; category?: string }) => {
      const sp = new URLSearchParams()
      const s = params.search ?? search
      const cat = params.category ?? category
      if (s) sp.set('search', s)
      if (cat && cat !== 'ALL') sp.set('category', cat)
      router.push(`/fleet/service-types?${sp.toString()}`)
    },
    [search, category, router],
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
        <label className="text-xs font-medium text-gray-500">Category</label>
        <select
          value={category || 'ALL'}
          onChange={(e) => push({ category: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          {categories.data?.filter((c) => c.isActive).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
