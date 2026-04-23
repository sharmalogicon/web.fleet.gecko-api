'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsRequisition } from '@/types/goods-requisition'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockGoodsRequisition } from '@/lib/mock/goods-requisitions'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<GoodsRequisition>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ isApproved, isCancel }: { isApproved: boolean; isCancel: boolean }) {
  if (isCancel) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Cancelled
      </span>
    )
  }
  if (isApproved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
      Draft
    </span>
  )
}

interface GoodsRequisitionListClientProps {
  initialData: GoodsRequisition[]
}

export function GoodsRequisitionListClient({ initialData }: GoodsRequisitionListClientProps) {
  const [data, setData] = useState<GoodsRequisition[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<GoodsRequisition | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
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
              onClick={() => router.push(`/fleet/goods-requisitions/${r.requisitionID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.documentDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'workOrder',
      header: 'Work Order',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.workOrderNo || '—'}</span>
            {r.equipmentCode && (
              <span className="text-xs text-gray-400">{r.equipmentCode}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'requiredBy',
      header: () => t('common.required'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900">{formatDate(r.requireDate)}</span>
            {r.jobRefNo && (
              <span className="text-xs text-gray-400">{r.jobRefNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const r = info.row.original
        return <StatusBadge isApproved={r.isApproved} isCancel={r.isCancel} />
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/goods-requisitions/${r.requisitionID}`)}
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
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockGoodsRequisition(deleteTarget.requisitionID)
      setData((prev) => prev.filter((r) => r.requisitionID !== deleteTarget.requisitionID))
      success('Goods requisition deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Goods Requisition"
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
