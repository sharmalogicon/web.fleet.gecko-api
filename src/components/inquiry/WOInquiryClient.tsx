'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { WorkOrder } from '@/types/work-order'
import { WO_BADGE } from '@/types/work-order'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<WorkOrder>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const columns = [
  col.display({
    id: 'woNoDate',
    header: 'WO No / Date',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono text-gray-900">
            {r.documentNo || `WO-${r.woID}`}
          </span>
          <span className="text-xs text-gray-400">{formatDate(r.orderDate)}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'equipment',
    header: 'Equipment',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.equipmentCode || '—'}</span>
          <span className="text-xs text-gray-400">{r.serviceTypeCategory || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'typeService',
    header: 'Type / Service',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.priority || '—'}</span>
          <span className="text-xs text-gray-400">{r.serviceTypeCategory || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const { status } = info.row.original
      const cls = WO_BADGE[status] ?? 'bg-gray-100 text-gray-600'
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {status}
        </span>
      )
    },
  }),
  col.display({
    id: 'remarks',
    header: 'Remarks',
    cell: (info) => {
      const { remarks } = info.row.original
      if (!remarks) return <span className="text-gray-400">—</span>
      return (
        <span className="text-sm text-gray-700 truncate block max-w-xs" title={remarks}>
          {remarks.length > 60 ? remarks.slice(0, 60) + '…' : remarks}
        </span>
      )
    },
  }),
]

interface WOInquiryClientProps {
  data: WorkOrder[]
}

export function WOInquiryClient({ data }: WOInquiryClientProps) {
  return <DataTable data={data} columns={columns} pageSize={15} />
}
