'use client'
import { createColumnHelper } from '@tanstack/react-table'
import type { TireMaintenanceLine } from '@/types/tire-maintenance'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<TireMaintenanceLine>()

interface Props {
  lines: TireMaintenanceLine[]
}

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  INSPECTION: { bg: 'bg-blue-100', text: 'text-blue-700' },
  REPAIR: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  RETREAD: { bg: 'bg-orange-100', text: 'text-orange-700' },
}

const columns = [
  col.display({
    id: 'type',
    header: 'Type',
    cell: (info) => {
      const t = info.row.original.transactionType
      const s = TYPE_BADGE[t] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
        >
          {t}
        </span>
      )
    },
  }),
  col.display({
    id: 'serialNo',
    header: 'Serial No.',
    cell: (info) => (
      <span className="text-sm font-mono text-gray-900">{info.row.original.serialNo}</span>
    ),
  }),
  col.display({
    id: 'meterRead',
    header: 'Meter Read',
    cell: (info) => {
      const v = info.row.original.meterRead
      return (
        <span className="text-sm text-gray-900">
          {v != null ? `${v.toLocaleString()} km` : '—'}
        </span>
      )
    },
  }),
  col.display({
    id: 'recapCount',
    header: 'Recap Count',
    cell: (info) => (
      <span className="text-sm text-gray-900">
        {info.row.original.recapCount ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'thread',
    header: 'Thread (mm)',
    cell: (info) => (
      <span className="text-sm text-gray-900">
        {info.row.original.tyreThread ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'threadBefore',
    header: 'Before',
    cell: (info) => (
      <span className="text-sm text-gray-900">
        {info.row.original.tyreThreadBefore ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'threadAfter',
    header: 'After',
    cell: (info) => (
      <span className="text-sm text-gray-900">
        {info.row.original.tyreThreadAfter ?? '—'}
      </span>
    ),
  }),
  col.display({
    id: 'remarks',
    header: 'Remarks',
    cell: (info) => (
      <span className="text-sm text-gray-600">{info.row.original.remarks ?? '—'}</span>
    ),
  }),
]

export function MaintenanceLinesSection({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No line items recorded for this maintenance.</p>
    )
  }

  return <DataTable data={lines} columns={columns} pageSize={20} />
}
