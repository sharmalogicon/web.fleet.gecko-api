'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { ReturnToVendor } from '@/types/return-to-vendor'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockReturn } from '@/lib/mock/return-to-vendor'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<ReturnToVendor>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

interface ReturnListClientProps {
  initialData: ReturnToVendor[]
}

export function ReturnListClient({ initialData }: ReturnListClientProps) {
  const [data, setData] = useState<ReturnToVendor[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<ReturnToVendor | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns: import('@tanstack/react-table').ColumnDef<ReturnToVendor, any>[] = [
    col.display({
      id: 'returnNoDate',
      header: 'Return No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/return-to-vendor/${r.returnID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.returnDate)}</span>
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
            <span className="text-sm font-medium text-gray-900">{r.vendorName}</span>
            {r.vendorCode && (
              <span className="text-xs text-gray-400">{r.vendorCode}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'returnedBy',
      header: 'Returned By',
      cell: (info) => {
        const r = info.row.original
        const truncated =
          r.remarks && r.remarks.length > 50
            ? r.remarks.slice(0, 50) + '…'
            : r.remarks
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.returnBy || '—'}</span>
            {truncated && (
              <span className="text-xs text-gray-400">{truncated}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amountActions',
      header: () => t('common.amount'),
      size: 150,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatCurrency(r.totalAmount)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/return-to-vendor/${r.returnID}`)}
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
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockReturn(deleteTarget.returnID)
      setData((prev) => prev.filter((r) => r.returnID !== deleteTarget.returnID))
      success('Return deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Return to Vendor"
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
