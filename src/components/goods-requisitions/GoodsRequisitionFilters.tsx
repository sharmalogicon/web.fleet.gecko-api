'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'APPROVED', 'CANCELLED'] as const

interface GoodsRequisitionFiltersProps {
  documentNo: string
  status: string
}

export function GoodsRequisitionFilters({ documentNo, status }: GoodsRequisitionFiltersProps) {
  const router = useRouter()

  const push = useCallback(
    (params: { documentNo?: string; status?: string }) => {
      const sp = new URLSearchParams()
      const dn = params.documentNo ?? documentNo
      const st = params.status ?? status
      if (dn) sp.set('documentNo', dn)
      if (st && st !== 'ALL') sp.set('status', st)
      router.push(`/fleet/goods-requisitions?${sp.toString()}`)
    },
    [documentNo, status, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Search by document no…"
        className="w-64"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Status</label>
        <select
          value={status || 'ALL'}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All Statuses' : s}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
