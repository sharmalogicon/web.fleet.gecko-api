'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { TireChange } from '@/types/tire-change'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<TireChange>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const columns = [
  col.display({
    id: 'txNoDate',
    header: 'Transaction No / Date',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono text-gray-900">{r.documentNo}</span>
          <span className="text-xs text-gray-400">{formatDate(r.changeDate)}</span>
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
          <span className="text-sm text-gray-900">{r.equipmentCode}</span>
          <span className="text-xs text-gray-400">{r.equipmentType || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'driverWO',
    header: 'Driver / WO',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
          <span className="text-xs text-gray-400">{r.workOrderNo || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'meterRead',
    header: 'Meter Read',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">
            {r.meterRead != null ? `${r.meterRead.toLocaleString()} km` : '—'}
          </span>
          <span className="text-xs text-gray-400">{r.changeBy || '—'}</span>
        </div>
      )
    },
  }),
]

interface TireChangeInquiryClientProps {
  data: TireChange[]
}

export function TireChangeInquiryClient({ data }: TireChangeInquiryClientProps) {
  return <DataTable data={data} columns={columns} pageSize={15} />
}
