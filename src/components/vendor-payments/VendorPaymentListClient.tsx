'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { VendorPayment } from '@/types/vendor-payment'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockVendorPayment } from '@/lib/mock/vendor-payments'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<VendorPayment>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function ApprovalBadge({ isApproved }: { isApproved: boolean }) {
  if (isApproved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
      Pending
    </span>
  )
}

interface VendorPaymentListClientProps {
  initialData: VendorPayment[]
}

export function VendorPaymentListClient({ initialData }: VendorPaymentListClientProps) {
  const [data, setData] = useState<VendorPayment[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<VendorPayment | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns: import('@tanstack/react-table').ColumnDef<VendorPayment, any>[] = [
    col.display({
      id: 'receiptNoDate',
      header: 'Receipt No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/invoice/vendor-payments/${r.vendorPaymentID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.receiptNo}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.receiptDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vendor',
      header: 'Vendor',
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
      header: 'Amount',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(r.totalAmount)}
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
            <ApprovalBadge isApproved={r.isApproved} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/invoice/vendor-payments/${r.vendorPaymentID}`)}
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
      removeMockVendorPayment(deleteTarget.vendorPaymentID)
      setData((prev) => prev.filter((r) => r.vendorPaymentID !== deleteTarget.vendorPaymentID))
      success('Vendor payment deleted', `${deleteTarget.receiptNo} has been removed.`)
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
        title="Delete Vendor Payment"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.receiptNo}"? This action cannot be undone.`
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
