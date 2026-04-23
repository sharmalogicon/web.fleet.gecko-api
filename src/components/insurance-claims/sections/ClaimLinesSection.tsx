'use client'
import { createColumnHelper } from '@tanstack/react-table'
import type { InsuranceClaimLine } from '@/types/insurance-claim'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<InsuranceClaimLine>()

interface Props {
  lines: InsuranceClaimLine[]
}

const columns = [
  col.display({
    id: 'activity',
    header: 'Activity',
    cell: (info) => (
      <span className="text-sm text-gray-900">{info.row.original.activityDescription || '—'}</span>
    ),
  }),
  col.display({
    id: 'stockCode',
    header: 'Stock Code',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.stockCode || '—'}</span>
    ),
  }),
  col.display({
    id: 'stockDescription',
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.stockDescription || '—'}</span>
    ),
  }),
  col.display({
    id: 'quantity',
    header: 'Qty',
    size: 80,
    cell: (info) => (
      <span className="text-sm text-gray-900 text-right block">
        {info.row.original.quantity ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'unitPrice',
    header: 'Unit Price',
    size: 120,
    cell: (info) => {
      const v = info.row.original.unitPrice
      return (
        <span className="text-sm text-gray-900 text-right block font-mono">
          {v != null ? `฿${v.toLocaleString()}` : '—'}
        </span>
      )
    },
  }),
  col.display({
    id: 'totalAmount',
    header: 'Total',
    size: 120,
    cell: (info) => {
      const v = info.row.original.totalAmount
      return (
        <span className="text-sm font-medium text-gray-900 text-right block font-mono">
          {v != null ? `฿${v.toLocaleString()}` : '—'}
        </span>
      )
    },
  }),
]

export function ClaimLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        No line items for this claim.
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={20} />
}
