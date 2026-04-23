'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { UnbilledItem } from '@/types/unbilled-invoice'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<UnbilledItem>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

interface UnbilledInvoiceClientProps {
  initialData: UnbilledItem[]
}

export function UnbilledInvoiceClient({ initialData }: UnbilledInvoiceClientProps) {
  const router = useRouter()

  const columns: import('@tanstack/react-table').ColumnDef<UnbilledItem, any>[] = [
    col.display({
      id: 'grNoDate',
      header: 'GR No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.grNo}</span>
            <span className="text-xs text-gray-400">{formatDate(r.orderDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'poNo',
      header: 'PO No',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.poNo}</span>
            {r.vendorDoNo && (
              <span className="text-xs text-gray-400">{r.vendorDoNo}</span>
            )}
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
            <span className="text-sm font-medium text-gray-900">{r.vendorName}</span>
            {r.billingCustomer && (
              <span className="text-xs text-gray-400">{r.billingCustomer}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'vatTotal',
      header: 'VAT / Total',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm font-medium text-gray-900">{formatCurrency(r.totalAmount)}</span>
            {r.vatAmount !== undefined && (
              <span className="text-xs text-gray-400">VAT {formatCurrency(r.vatAmount)}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'nettAction',
      header: 'Net Amount',
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatCurrency(r.nettAmount)}
            </span>
            <button
              type="button"
              onClick={() => router.push(`/invoice/vendor/new?grNo=${encodeURIComponent(r.grNo)}`)}
              className="shrink-0 text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Create Invoice
            </button>
          </div>
        )
      },
    }),
  ]

  return <DataTable data={initialData} columns={columns} pageSize={15} />
}
