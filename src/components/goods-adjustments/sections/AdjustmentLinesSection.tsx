'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { AdjustmentLine } from '@/types/goods-adjustment'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<AdjustmentLine>()

interface Props {
  lines: AdjustmentLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<AdjustmentLine, any>[] = [
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
    id: 'location',
    header: 'Location',
    cell: (info) => (
      <span className="text-sm text-gray-700">
        {info.row.original.stockLocationDescription || '—'}
      </span>
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
    id: 'price',
    header: 'Price',
    size: 110,
    cell: (info) => (
      <span className="text-sm text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.price)}
      </span>
    ),
  }),
  col.display({
    id: 'totalPrice',
    header: 'Total',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.totalPrice)}
      </span>
    ),
  }),
]

export function AdjustmentLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
