'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface StandardRateFiltersProps {
  rateCode: string
  description: string
  status: string
}

export function StandardRateFilters({
  rateCode,
  description,
  status,
}: StandardRateFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      rateCode?: string
      description?: string
      status?: string
    }) => {
      const sp = new URLSearchParams()
      const rc = params.rateCode ?? rateCode
      const de = params.description ?? description
      const st = params.status ?? status
      if (rc) sp.set('rateCode', rc)
      if (de) sp.set('description', de)
      if (st) sp.set('status', st)
      router.push(`/tariff/standard-rates?${sp.toString()}`)
    },
    [rateCode, description, status, router],
  )

  return (
    <>
      <SearchInput
        value={rateCode}
        onChange={(v) => push({ rateCode: v })}
        placeholder="Search by rate code…"
        className="w-44"
      />
      <SearchInput
        value={description}
        onChange={(v) => push({ description: v })}
        placeholder="Search by description…"
        className="w-48"
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
    </>
  )
}
