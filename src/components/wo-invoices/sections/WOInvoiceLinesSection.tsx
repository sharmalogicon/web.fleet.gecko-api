'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { WOInvoiceLine } from '@/types/wo-invoice'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<WOInvoiceLine>()

interface Props {
  lines: WOInvoiceLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<WOInvoiceLine, any>[] = [
  col.display({
    id: 'workOrderNo',
    header: 'WO No',
    cell: (info) => (
      <span className="text-sm font-medium font-mono text-gray-900">
        {info.row.original.workOrderNo}
      </span>
    ),
  }),
  col.display({
    id: 'serviceType',
    header: 'Service Type',
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.serviceType || '—'}</span>
    ),
  }),
  col.display({
    id: 'chargeCode',
    header: 'Charge Code',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.chargeCode || '—'}</span>
    ),
  }),
  col.display({
    id: 'transactionType',
    header: 'Transaction',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.transactionType || '—'}</span>
    ),
  }),
  col.display({
    id: 'equipmentCode',
    header: 'Equipment',
    size: 100,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.equipmentCode || '—'}</span>
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
    id: 'stockType',
    header: 'Stock Type',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.stockType || '—'}</span>
    ),
  }),
]

export function WOInvoiceLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No line items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
