'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { WOCreditNote } from '@/types/wo-credit-note'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockWOCreditNote } from '@/lib/mock/wo-credit-notes'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<WOCreditNote>()

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

interface WOCreditNoteListClientProps {
  initialData: WOCreditNote[]
}

export function WOCreditNoteListClient({ initialData }: WOCreditNoteListClientProps) {
  const [data, setData] = useState<WOCreditNote[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<WOCreditNote | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns: import('@tanstack/react-table').ColumnDef<WOCreditNote, any>[] = [
    col.display({
      id: 'creditNoteNoDate',
      header: 'Credit Note No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/invoice/credit-notes/wo/${r.woCreditNoteID}`)}
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
      id: 'customer',
      header: 'Customer',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.customerName || '—'}</span>
            {r.creditTerm && (
              <span className="text-xs text-gray-400">{r.creditTerm}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(r.nettAmount)}
            </span>
            {r.vat !== undefined && r.vat > 0 && (
              <span className="text-xs text-gray-400">VAT {r.vat}%</span>
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
                onClick={() => router.push(`/invoice/credit-notes/wo/${r.woCreditNoteID}`)}
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
      removeMockWOCreditNote(deleteTarget.woCreditNoteID)
      setData((prev) => prev.filter((r) => r.woCreditNoteID !== deleteTarget.woCreditNoteID))
      success('WO credit note deleted', `${deleteTarget.creditNoteNo} has been removed.`)
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
        title="Delete WO Credit Note"
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
