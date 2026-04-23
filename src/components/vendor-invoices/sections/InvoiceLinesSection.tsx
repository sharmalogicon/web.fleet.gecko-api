'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { VendorInvoiceLine } from '@/types/vendor-invoice'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<VendorInvoiceLine>()

interface Props {
  lines: VendorInvoiceLine[]
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const columns: import('@tanstack/react-table').ColumnDef<VendorInvoiceLine, any>[] = [
  col.display({
    id: 'stockCode',
    header: 'Stock Code',
    cell: (info) => (
      <span className="text-sm font-medium font-mono text-gray-900">
        {info.row.original.stockCode || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'stockType',
    header: 'Type',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.stockType || '—'}</span>
    ),
  }),
  col.display({
    id: 'description',
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.description || '—'}</span>
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
    id: 'vendorInvoiceRef',
    header: 'Vendor Invoice Ref',
    cell: (info) => (
      <span className="text-sm text-gray-700 font-mono">
        {info.row.original.vendorInvoiceRef || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'vat',
    header: 'VAT (%)',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-700 tabular-nums">
        {info.row.original.vat !== undefined ? `${info.row.original.vat}%` : '—'}
      </span>
    ),
  }),
  col.display({
    id: 'netAmount',
    header: 'Net',
    size: 110,
    cell: (info) => (
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.netAmount)}
      </span>
    ),
  }),
  col.display({
    id: 'registrationNo',
    header: 'Reg No',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">
        {info.row.original.registrationNo || '—'}
      </span>
    ),
  }),
]

export function InvoiceLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No line items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
