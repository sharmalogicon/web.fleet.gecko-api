'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { ReturnLine } from '@/types/return-to-vendor'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<ReturnLine>()

interface Props {
  lines: ReturnLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<ReturnLine, any>[] = [
  col.display({
    id: 'poNo',
    header: 'PO No',
    cell: (info) => (
      <span className="text-sm font-medium font-mono text-gray-900">
        {info.row.original.poNo}
      </span>
    ),
  }),
  col.display({
    id: 'serialNo',
    header: 'Serial No',
    cell: (info) => (
      <span className="text-sm text-gray-700">
        {info.row.original.serialNo || '—'}
      </span>
    ),
  }),
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
    id: 'quantity',
    header: 'Qty',
    size: 70,
    cell: (info) => (
      <span className="text-sm text-gray-900 tabular-nums">
        {info.row.original.quantity}
      </span>
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
    id: 'totalAmount',
    header: 'Total',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.totalAmount)}
      </span>
    ),
  }),
]

export function ReturnLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No line items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
