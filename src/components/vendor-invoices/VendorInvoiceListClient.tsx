'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { VendorInvoice } from '@/types/vendor-invoice'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockVendorInvoice } from '@/lib/mock/vendor-invoices'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<VendorInvoice>()

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

interface VendorInvoiceListClientProps {
  initialData: VendorInvoice[]
}

export function VendorInvoiceListClient({ initialData }: VendorInvoiceListClientProps) {
  const [data, setData] = useState<VendorInvoice[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<VendorInvoice | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns: import('@tanstack/react-table').ColumnDef<VendorInvoice, any>[] = [
    col.display({
      id: 'docNoDate',
      header: 'Invoice No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/invoice/vendor/${r.vendorInvoiceID}`)}
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
      id: 'customer',
      header: 'Customer',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.customerName || '—'}</span>
            {r.vendorInvoiceNo && (
              <span className="text-xs text-gray-400">{r.vendorInvoiceNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'creditTerm',
      header: 'Credit Term',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.creditTerm || '—'}</span>
            {r.address && (
              <span className="text-xs text-gray-400 truncate max-w-[180px]">{r.address}</span>
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
            {r.vat !== undefined && (
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
        const canDelete = r.status === 'ACTIVE' && r.lines.length === 0
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={r.status} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/invoice/vendor/${r.vendorInvoiceID}`)}
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
      removeMockVendorInvoice(deleteTarget.vendorInvoiceID)
      setData((prev) => prev.filter((r) => r.vendorInvoiceID !== deleteTarget.vendorInvoiceID))
      success('Vendor invoice deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Vendor Invoice"
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
