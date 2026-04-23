'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { POLine } from '@/types/purchase-order'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<POLine>()

interface Props {
  lines: POLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<POLine, any>[] = [
  col.display({
    id: 'stockCode',
    header: 'Stock Code',
    cell: (info) => (
      <span className="text-sm font-medium font-mono text-gray-900">
        {info.row.original.stockCode}
      </span>
    ),
  }),
  col.display({
    id: 'description',
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-gray-700">
        {info.row.original.stockDescription || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'uom',
    header: 'UOM',
    size: 70,
    cell: (info) => (
      <span className="text-sm text-gray-900">{info.row.original.uom}</span>
    ),
  }),
  col.display({
    id: 'quantity',
    header: 'Qty',
    size: 70,
    cell: (info) => (
      <span className="text-sm text-gray-900 tabular-nums">{info.row.original.quantity}</span>
    ),
  }),
  col.display({
    id: 'unitPrice',
    header: 'Unit Price',
    size: 110,
    cell: (info) => (
      <span className="text-sm text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.unitPrice)}
      </span>
    ),
  }),
  col.display({
    id: 'discount',
    header: 'Discount',
    size: 100,
    cell: (info) => {
      const r = info.row.original
      if (!r.discountAmount) return <span className="text-sm text-gray-400">—</span>
      const label =
        r.discountType === 'PERCENT'
          ? `${r.discountAmount}%`
          : formatCurrency(r.discountAmount)
      return <span className="text-sm text-gray-700 tabular-nums">{label}</span>
    },
  }),
  col.display({
    id: 'totalAmount',
    header: 'Total',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.totalAmount)}
      </span>
    ),
  }),
  col.display({
    id: 'receivedQty',
    header: 'Received',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-700 tabular-nums">
        {info.row.original.receivedQty ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'pendingQty',
    header: 'Pending',
    size: 80,
    cell: (info) => {
      const val = info.row.original.pendingQty
      if (val === undefined || val === null) return <span className="text-sm text-gray-400">—</span>
      return (
        <span className={`text-sm tabular-nums font-medium ${val > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
          {val}
        </span>
      )
    },
  }),
]

export function POLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
