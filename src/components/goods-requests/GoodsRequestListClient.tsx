'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsRequest } from '@/types/goods-request'
import { GOODS_REQUEST_STATUS_MAP } from '@/types/goods-request'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockGoodsRequest } from '@/lib/mock/goods-requests'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<GoodsRequest>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface GoodsRequestListClientProps {
  initialData: GoodsRequest[]
}

export function GoodsRequestListClient({ initialData }: GoodsRequestListClientProps) {
  const [data, setData] = useState<GoodsRequest[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<GoodsRequest | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'reqNoDate',
      header: 'Req No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/goods-requests/${r.goodsRequestID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.reqNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.reqDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'requiredBy',
      header: 'Required By',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900">{formatDate(r.requireDate)}</span>
            {r.workOrderNo && (
              <span className="text-xs text-gray-400">{r.workOrderNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'jobRef',
      header: 'Job Ref',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.jobRefNo || '—'}</span>
            {r.remarks && (
              <span className="text-xs text-gray-400 truncate max-w-[200px]">{r.remarks}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const { status } = info.row.original
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${GOODS_REQUEST_STATUS_MAP[status]}`}
          >
            {status}
          </span>
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
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/goods-requests/${r.goodsRequestID}`)}
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
      removeMockGoodsRequest(deleteTarget.goodsRequestID)
      setData((prev) => prev.filter((r) => r.goodsRequestID !== deleteTarget.goodsRequestID))
      success('Goods request deleted', `${deleteTarget.reqNo} has been removed.`)
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
        title="Delete Goods Request"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.reqNo}"? This action cannot be undone.`
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
