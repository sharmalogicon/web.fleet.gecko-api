'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { VendorCreditNote } from '@/types/vendor-credit-note'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockVendorCreditNote } from '@/lib/mock/vendor-credit-notes'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<VendorCreditNote>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'CANCELLED' }) {
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  )
}

interface VendorCreditNoteListClientProps {
  initialData: VendorCreditNote[]
}

export function VendorCreditNoteListClient({ initialData }: VendorCreditNoteListClientProps) {
  const [data, setData] = useState<VendorCreditNote[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<VendorCreditNote | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns: import('@tanstack/react-table').ColumnDef<VendorCreditNote, any>[] = [
    col.display({
      id: 'creditNoteNoDate',
      header: 'Credit Note No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/invoice/credit-notes/vendor/${r.vendorCreditNoteID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.creditNoteNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.creditNoteDate)}</span>
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
            <span className="text-sm text-gray-900 font-medium">{r.vendorName || '—'}</span>
            {r.vendorCode && (
              <span className="text-xs text-gray-400 font-mono">{r.vendorCode}</span>
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
              {formatCurrency(r.nettAmount)}
            </span>
            {r.discount !== undefined && r.discount > 0 && (
              <span className="text-xs text-gray-400">
                Disc {r.discountType === 'PERCENT' ? `${r.discount}%` : formatCurrency(r.discount)}
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
            <StatusBadge status={r.status} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/invoice/credit-notes/vendor/${r.vendorCreditNoteID}`)}
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
      removeMockVendorCreditNote(deleteTarget.vendorCreditNoteID)
      setData((prev) => prev.filter((r) => r.vendorCreditNoteID !== deleteTarget.vendorCreditNoteID))
      success('Vendor credit note deleted', `${deleteTarget.creditNoteNo} has been removed.`)
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
        title="Delete Vendor Credit Note"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.creditNoteNo}"? This action cannot be undone.`
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
