'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { PurchaseOrder } from '@/types/purchase-order'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockPurchaseOrder } from '@/lib/mock/purchase-orders'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<PurchaseOrder>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
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

interface POListClientProps {
  initialData: PurchaseOrder[]
}

export function POListClient({ initialData }: POListClientProps) {
  const [data, setData] = useState<PurchaseOrder[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: 'PO No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/purchase-orders/${r.purchaseOrderID}`)}
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
            {r.vendorQuotationNo && (
              <span className="text-xs text-gray-400">{r.vendorQuotationNo}</span>
            )}
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
            {r.goodsRequestNo && (
              <span className="text-xs text-gray-400">{r.goodsRequestNo}</span>
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
        const showNett =
          r.nettAmount !== undefined &&
          r.nettAmount > 0 &&
          r.nettAmount !== r.totalAmount
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(r.totalAmount)}
            </span>
            {showNett && (
              <span className="text-xs text-gray-400">
                Nett {formatCurrency(r.nettAmount!)}
              </span>
            )}
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
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge isApproved={r.isApproved} isCancel={r.isCancel} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/purchase-orders/${r.purchaseOrderID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              {!r.isApproved && !r.isCancel && (
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
      removeMockPurchaseOrder(deleteTarget.purchaseOrderID)
      setData((prev) => prev.filter((r) => r.purchaseOrderID !== deleteTarget.purchaseOrderID))
      success('Purchase order deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Purchase Order"
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
