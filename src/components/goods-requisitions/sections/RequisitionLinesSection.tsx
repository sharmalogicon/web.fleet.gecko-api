'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { GoodsRequisitionLine } from '@/types/goods-requisition'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<GoodsRequisitionLine>()

interface Props {
  lines: GoodsRequisitionLine[]
}

const columns: import('@tanstack/react-table').ColumnDef<GoodsRequisitionLine, any>[] = [
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
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-900">{info.row.original.quantity}</span>
    ),
  }),
  col.display({
    id: 'uom',
    header: 'UOM',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-900">{info.row.original.uom}</span>
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

export function RequisitionLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
