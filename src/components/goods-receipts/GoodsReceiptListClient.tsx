'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsReceipt } from '@/types/goods-receipt'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockGoodsReceipt } from '@/lib/mock/goods-receipts'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<GoodsReceipt>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function StatusBadge({ isCancel }: { isCancel: boolean }) {
  if (isCancel) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      Received
    </span>
  )
}

interface GoodsReceiptListClientProps {
  initialData: GoodsReceipt[]
}

export function GoodsReceiptListClient({ initialData }: GoodsReceiptListClientProps) {
  const [data, setData] = useState<GoodsReceipt[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<GoodsReceipt | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: 'Receipt No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/goods-receipts/${r.goodsReceiptID}`)}
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
      id: 'vendor',
      header: () => t('common.vendor'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.vendorName}</span>
            {r.poNo && (
              <span className="text-xs text-gray-400">PO: {r.poNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'receivedBy',
      header: 'Received By',
      cell: (info) => {
        const r = info.row.original
        const truncatedRemarks =
          r.remarks && r.remarks.length > 50
            ? r.remarks.slice(0, 50) + '…'
            : r.remarks
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.receiptBy || '—'}</span>
            {truncatedRemarks && (
              <span className="text-xs text-gray-400">{truncatedRemarks}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(r.totalAmount)}
            </span>
            <span className="text-xs text-gray-400">
              {r.lines.length} item{r.lines.length !== 1 ? 's' : ''}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'statusActions',
      header: () => t('common.status'),
      size: 130,
      cell: (info) => {
        const r = info.row.original
        const canDelete = !r.isCancel && r.lines.length === 0
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge isCancel={r.isCancel} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/goods-receipts/${r.goodsReceiptID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              {canDelete && (
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
      removeMockGoodsReceipt(deleteTarget.goodsReceiptID)
      setData((prev) => prev.filter((r) => r.goodsReceiptID !== deleteTarget.goodsReceiptID))
      success('Receipt deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Goods Receipt"
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
