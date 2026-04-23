'use client'
import { createColumnHelper } from '@tanstack/react-table'
import type { CustomerRateLine } from '@/types/customer-rate'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<CustomerRateLine>()

interface Props {
  lines: CustomerRateLine[]
}

const columns = [
  col.display({
    id: 'chargeCode',
    header: 'Charge Code',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-900">{info.row.original.chargeCode}</span>
    ),
  }),
  col.display({
    id: 'chargeDescription',
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.chargeDescription || '—'}</span>
    ),
  }),
  col.display({
    id: 'orderType',
    header: 'Order Type',
    size: 110,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.orderType || '—'}</span>
    ),
  }),
  col.display({
    id: 'movementCode',
    header: 'Movement',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.movementCode || '—'}</span>
    ),
  }),
  col.display({
    id: 'chargeType',
    header: 'Charge Type',
    size: 110,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.chargeType || '—'}</span>
    ),
  }),
  col.display({
    id: 'size',
    header: 'Size',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.size || '—'}</span>
    ),
  }),
  col.display({
    id: 'billTo',
    header: 'Bill To',
    size: 100,
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.billTo || '—'}</span>
    ),
  }),
  col.display({
    id: 'sellRate',
    header: 'Sell Rate (฿)',
    size: 120,
    cell: (info) => (
      <span className="text-sm font-medium text-gray-900 text-right block font-mono">
        ฿{info.row.original.sellRate.toLocaleString()}
      </span>
    ),
  }),
]

export function RateLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        No charge lines for this quotation.
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={20} />
}
