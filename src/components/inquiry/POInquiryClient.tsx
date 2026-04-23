'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { PurchaseOrder } from '@/types/purchase-order'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<PurchaseOrder>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(val?: number): string {
  if (val == null) return '—'
  return `฿${val.toLocaleString()}`
}

function getStatusLabel(po: PurchaseOrder): { label: string; cls: string } {
  if (po.isCancel) return { label: 'Cancelled', cls: 'bg-red-100 text-red-600' }
  if (po.isApproved) return { label: 'Approved', cls: 'bg-green-100 text-green-700' }
  return { label: 'Draft', cls: 'bg-gray-100 text-gray-600' }
}

const columns = [
  col.display({
    id: 'poNoDate',
    header: 'PO No / Date',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono text-gray-900">{r.documentNo}</span>
          <span className="text-xs text-gray-400">{formatDate(r.documentDate)}</span>
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
          <span className="text-sm text-gray-900">{r.vendorName}</span>
          {r.vendorQuotationNo && (
            <span className="text-xs text-gray-400">Quot: {r.vendorQuotationNo}</span>
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
          <span className="text-sm font-semibold text-gray-900">{formatDate(r.requireDate)}</span>
          {r.goodsRequestNo && (
            <span className="text-xs text-gray-400">{r.goodsRequestNo}</span>
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
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-900">{formatCurrency(r.totalAmount)}</span>
          <span className="text-xs text-gray-400">Net: {formatCurrency(r.nettAmount)}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const { label, cls } = getStatusLabel(info.row.original)
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {label}
        </span>
      )
    },
  }),
]

interface POInquiryClientProps {
  data: PurchaseOrder[]
}

export function POInquiryClient({ data }: POInquiryClientProps) {
  return <DataTable data={data} columns={columns} pageSize={15} />
}
