'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsReceiptLine } from '@/types/goods-receipt'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<GoodsReceiptLine>()

interface Props {
  lines: GoodsReceiptLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<GoodsReceiptLine, any>[] = [
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
    id: 'poQty',
    header: 'PO Qty',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-700 tabular-nums">
        {info.row.original.poQty ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'receivedQty',
    header: 'Received',
    size: 80,
    cell: (info) => (
      <span className="text-sm font-medium text-gray-900 tabular-nums">
        {info.row.original.receivedQty}
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
  col.display({
    id: 'remarks',
    header: 'Remarks',
    cell: (info) => (
      <span className="text-sm text-gray-500">{info.row.original.remarks || '—'}</span>
    ),
  }),
]

export function ReceiptLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
