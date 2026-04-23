'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { VendorPaymentLine } from '@/types/vendor-payment'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<VendorPaymentLine>()

interface Props {
  lines: VendorPaymentLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<VendorPaymentLine, any>[] = [
  col.display({
    id: 'workOrderNo',
    header: 'WO No',
    cell: (info) => (
      <span className="text-sm font-medium font-mono text-gray-900">
        {info.row.original.workOrderNo || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'repairCode',
    header: 'Repair Code',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.repairCode || '—'}</span>
    ),
  }),
  col.display({
    id: 'containerNo',
    header: 'Container',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.containerNo || '—'}</span>
    ),
  }),
  col.display({
    id: 'size',
    header: 'Size',
    size: 70,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.size || '—'}</span>
    ),
  }),
  col.display({
    id: 'eirNo',
    header: 'EIR No',
    size: 100,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.eirNo || '—'}</span>
    ),
  }),
  col.display({
    id: 'responsibility',
    header: 'Responsibility',
    size: 120,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.responsibility || '—'}</span>
    ),
  }),
  col.display({
    id: 'vat',
    header: 'VAT%',
    size: 70,
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700">
        {info.row.original.vat !== undefined ? `${info.row.original.vat}%` : '—'}
      </span>
    ),
  }),
  col.display({
    id: 'vatAmount',
    header: 'VAT Amt',
    size: 110,
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700">
        {formatCurrency(info.row.original.vatAmount)}
      </span>
    ),
  }),
  col.display({
    id: 'totalAmount',
    header: 'Total',
    size: 120,
    cell: (info) => (
      <span className="text-sm font-semibold tabular-nums text-gray-900">
        {formatCurrency(info.row.original.totalAmount)}
      </span>
    ),
  }),
]

export function PaymentLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No payment lines
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
