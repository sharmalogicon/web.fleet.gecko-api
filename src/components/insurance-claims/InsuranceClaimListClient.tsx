'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { InsuranceClaim } from '@/types/insurance-claim'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockInsuranceClaim } from '@/lib/mock/insurance-claims'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<InsuranceClaim>()

interface InsuranceClaimListClientProps {
  initialData: InsuranceClaim[]
}

export function InsuranceClaimListClient({ initialData }: InsuranceClaimListClientProps) {
  const [data, setData] = useState<InsuranceClaim[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<InsuranceClaim | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: 'Doc No / Date',
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
            <span className="text-xs text-gray-400">{r.documentDate}</span>
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
      header: 'Amount',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              ฿{(r.nettAmount ?? r.totalAmount).toLocaleString()}
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
        const hasActiveLines = !r.isCancel && r.lines.length > 0
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${
                r.isCancel
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {r.isCancel ? 'Cancelled' : 'Active'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/insurance-claims/${r.claimID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              {!hasActiveLines && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(r)}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockInsuranceClaim(deleteTarget.claimID)
      setData((prev) => prev.filter((r) => r.claimID !== deleteTarget.claimID))
      success('Insurance claim deleted', `${deleteTarget.documentNo} has been removed.`)
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Insurance Claim"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.documentNo}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
