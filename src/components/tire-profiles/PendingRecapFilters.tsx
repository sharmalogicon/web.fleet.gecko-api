'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const

interface PendingRecapFiltersProps {
  serialNo: string
  brand: string
  status: string
}

export function PendingRecapFilters({ serialNo, brand, status }: PendingRecapFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: { serialNo?: string; brand?: string; status?: string }) => {
      const sp = new URLSearchParams()
      const sn = params.serialNo ?? serialNo
      const br = params.brand ?? brand
      const st = params.status ?? status
      if (sn) sp.set('serialNo', sn)
      if (br) sp.set('brand', br)
      if (st && st !== 'ALL') sp.set('status', st)
      router.push(`/fleet/tires/pending-recap?${sp.toString()}`)
    },
    [serialNo, brand, status, router],
  )

  return (
    <>
      <SearchInput
        value={serialNo}
        onChange={(v) => push({ serialNo: v })}
        placeholder="Search by serial no…"
        className="w-48"
      />
      <SearchInput
        value={brand}
        onChange={(v) => push({ brand: v })}
        placeholder="Search by brand…"
        className="w-44"
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
    </>
  )
}
