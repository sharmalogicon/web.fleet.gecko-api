'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { VendorCreditNoteLine } from '@/types/vendor-credit-note'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<VendorCreditNoteLine>()

interface Props {
  lines: VendorCreditNoteLine[]
}

const columns: import('@tanstack/react-table').ColumnDef<VendorCreditNoteLine, any>[] = [
  col.display({
    id: 'transactionNo',
    header: 'Transaction No',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-900">
        {info.row.original.transactionNo || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'equipmentCode',
    header: 'Equipment',
    size: 120,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">
        {info.row.original.equipmentCode || '—'}
      </span>
    ),
  }),
  col.display({
    id: 'glCode',
    header: 'GL Code',
    size: 100,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.glCode || '—'}</span>
    ),
  }),
  col.display({
    id: 'code',
    header: 'Code',
    size: 100,
    cell: (info) => (
      <span className="text-sm font-mono text-gray-700">{info.row.original.code || '—'}</span>
    ),
  }),
  col.display({
    id: 'description',
    header: 'Description',
    cell: (info) => (
      <span className="text-sm text-gray-700">{info.row.original.description || '—'}</span>
    ),
  }),
]

export function VendorCreditNoteLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        No line items
      </div>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={50} />
}
