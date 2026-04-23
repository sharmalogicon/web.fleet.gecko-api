'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsAdjustment, AdjustmentType } from '@/types/goods-adjustment'
import { ADJUSTMENT_TYPE_MAP } from '@/types/goods-adjustment'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockGoodsAdjustment } from '@/lib/mock/goods-adjustments'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<GoodsAdjustment>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_BADGE_CLASSES: Record<AdjustmentType, string> = {
  INCREASE: 'bg-green-100 text-green-700',
  DECREASE: 'bg-red-100 text-red-700',
  TRANSFER: 'bg-blue-100 text-blue-700',
  WRITE_OFF: 'bg-gray-100 text-gray-600',
}

function TypeBadge({ type }: { type: AdjustmentType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLASSES[type]}`}
    >
      {ADJUSTMENT_TYPE_MAP[type]}
    </span>
  )
}

interface AdjustmentListClientProps {
  initialData: GoodsAdjustment[]
}

export function AdjustmentListClient({ initialData }: AdjustmentListClientProps) {
  const [data, setData] = useState<GoodsAdjustment[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<GoodsAdjustment | null>(null)
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
              onClick={() => router.push(`/fleet/goods-adjustments/${r.adjustmentID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.adjustmentDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'type',
      header: 'Type',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <TypeBadge type={r.adjustmentType} />
            {r.adjustmentTypeDescription && (
              <span className="text-xs text-gray-400">{r.adjustmentTypeDescription}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'remarks',
      header: 'Remarks',
      cell: (info) => {
        const r = info.row.original
        const truncated =
          r.remarks && r.remarks.length > 60
            ? r.remarks.slice(0, 60) + '…'
            : r.remarks
        return (
          <span className="text-sm text-gray-700">{truncated || '—'}</span>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/fleet/goods-adjustments/${r.adjustmentID}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="text-xs text-red-500 hover:underline"
            >
              {t('common.delete')}
            </button>
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockGoodsAdjustment(deleteTarget.adjustmentID)
      setData((prev) => prev.filter((r) => r.adjustmentID !== deleteTarget.adjustmentID))
      success('Adjustment deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Goods Adjustment"
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
