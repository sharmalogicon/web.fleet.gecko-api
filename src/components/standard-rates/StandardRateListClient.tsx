'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { StandardRate } from '@/types/standard-rate'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockStandardRate } from '@/lib/mock/standard-rates'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<StandardRate>()

interface StandardRateListClientProps {
  initialData: StandardRate[]
}

export function StandardRateListClient({ initialData }: StandardRateListClientProps) {
  const [data, setData] = useState<StandardRate[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<StandardRate | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'rateCodeDate',
      header: 'Rate Code / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/tariff/standard-rates/${r.standardRateID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.rateCode}
            </button>
            <span className="text-xs text-gray-400">{r.rateDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'descriptionEffective',
      header: () => t('common.description'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.description || '—'}</span>
            <span className="text-xs text-gray-400">Effective: {r.effectiveDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'approvedBy',
      header: 'Approved By',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-700">{r.approvedBy || '—'}</span>
            {r.approvedOn && (
              <span className="text-xs text-gray-400">{r.approvedOn}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'statusActions',
      header: () => t('common.status'),
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${
                r.isApproved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {r.isApproved ? 'Approved' : 'Draft'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/tariff/standard-rates/${r.standardRateID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              {!r.isApproved && (
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
      removeMockStandardRate(deleteTarget.standardRateID)
      setData((prev) => prev.filter((r) => r.standardRateID !== deleteTarget.standardRateID))
      success('Standard rate deleted', `${deleteTarget.rateCode} has been removed.`)
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
        title="Delete Standard Rate"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.rateCode}"? This action cannot be undone.`
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
