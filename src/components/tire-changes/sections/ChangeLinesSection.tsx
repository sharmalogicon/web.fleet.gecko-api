'use client'
import { createColumnHelper } from '@tanstack/react-table'
import type { TireChangeLine } from '@/types/tire-change'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<TireChangeLine>()

interface Props {
  lines: TireChangeLine[]
}

const columns = [
  col.display({
    id: 'oldSerial',
    header: 'Old Serial No.',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-900">{info.row.original.oldSerialNo}</span>
    ),
  }),
  col.display({
    id: 'newSerial',
    header: 'New Serial No.',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-900">
        {info.row.original.newSerialNo ?? <span className="text-gray-400">—</span>}
      </span>
    ),
  }),
  col.display({
    id: 'position',
    header: 'Position',
    cell: (info) => (
      <span className="text-sm text-gray-900">
        {info.row.original.tyrePosition.replace(/_/g, ' ')}
      </span>
    ),
  }),
  col.display({
    id: 'condition',
    header: 'Condition',
    cell: (info) => {
      const c = info.row.original.condition
      const cls =
        c === 'GOOD'
          ? 'bg-green-100 text-green-700'
          : c === 'FAIR'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
          {c}
        </span>
      )
    },
  }),
  col.display({
    id: 'remarks',
    header: 'Remarks',
    cell: (info) => (
      <span className="text-sm text-gray-600">{info.row.original.remarks ?? '—'}</span>
    ),
  }),
]

export function ChangeLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No line items recorded for this change.</p>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={20} />
}
