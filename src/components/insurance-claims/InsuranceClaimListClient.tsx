'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { fmtDate } from '@/components/docs/DocBits'
import { CLAIM_STATUS_TONE, type ClaimRow } from '@/lib/api/fleet/insuranceClaims'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<ClaimRow>()

/** Same columns; the API status in the status cell; no Delete (a claim is cancelled). */
export function InsuranceClaimListClient({ data }: { data: ClaimRow[] }) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: () => t('common.docDate'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/insurance-claims/${r.claimID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{fmtDate(r.documentDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'accidentClaimRef',
      header: 'Accident / Claim Ref',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-mono">{r.accidentRefNo}</span>
            {r.claimRefNo && (
              <span className="text-xs text-gray-400">{r.claimRefNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'equipmentDriver',
      header: 'Equipment / Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode || '—'}</span>
            {r.driverName && (
              <span className="text-xs text-gray-400">{r.driverName}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amountVendor',
      header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              ฿{r.nettAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {r.vendorName && (
              <span className="text-xs text-gray-400">{r.vendorName}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'statusActions',
      header: () => t('common.status'),
      size: 150,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${CLAIM_STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {t(`claim.status.${r.status}`)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/insurance-claims/${r.claimID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
