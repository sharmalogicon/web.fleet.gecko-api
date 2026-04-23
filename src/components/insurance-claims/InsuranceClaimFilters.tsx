'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useT } from '@/i18n/I18nContext'

interface InsuranceClaimFiltersProps {
  documentNo: string
  accidentRefNo: string
  vendorName: string
  status: string
}

export function InsuranceClaimFilters({
  documentNo,
  accidentRefNo,
  vendorName,
  status,
}: InsuranceClaimFiltersProps) {
  const router = useRouter()
  const { t } = useT()

  const push = useCallback(
    (params: {
      documentNo?: string
      accidentRefNo?: string
      vendorName?: string
      status?: string
    }) => {
      const sp = new URLSearchParams()
      const dn = params.documentNo ?? documentNo
      const ar = params.accidentRefNo ?? accidentRefNo
      const vn = params.vendorName ?? vendorName
      const st = params.status ?? status
      if (dn) sp.set('documentNo', dn)
      if (ar) sp.set('accidentRefNo', ar)
      if (vn) sp.set('vendorName', vn)
      if (st) sp.set('status', st)
      router.push(`/fleet/insurance-claims?${sp.toString()}`)
    },
    [documentNo, accidentRefNo, vendorName, status, router],
  )

  return (
    <>
      <SearchInput
        value={documentNo}
        onChange={(v) => push({ documentNo: v })}
        placeholder="Search by doc no…"
        className="w-44"
      />
      <SearchInput
        value={accidentRefNo}
        onChange={(v) => push({ accidentRefNo: v })}
        placeholder="Search by accident ref…"
        className="w-44"
      />
      <SearchInput
        value={vendorName}
        onChange={(v) => push({ vendorName: v })}
        placeholder="Search by vendor…"
        className="w-44"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
        <select
          value={status}
          onChange={(e) => push({ status: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('common.all')}</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </>
  )
}
