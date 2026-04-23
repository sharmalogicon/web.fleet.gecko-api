'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { TruckMovement } from '@/lib/data/inquiry/truck-movements'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<TruckMovement>()

const TRIP_TYPE_BADGE: Record<string, string> = {
  IMPORT: 'bg-blue-100 text-blue-700',
  EXPORT: 'bg-green-100 text-green-700',
  LOCAL: 'bg-gray-100 text-gray-600',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const columns = [
  col.display({
    id: 'rowNo',
    header: '#',
    size: 48,
    cell: (info) => (
      <span className="text-xs text-gray-400 tabular-nums">{info.row.index + 1}</span>
    ),
  }),
  col.display({
    id: 'truckDateTime',
    header: 'Truck No / Date-Time',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono text-gray-900">{r.truckNo}</span>
          <span className="text-xs text-gray-400">{formatDateTime(r.dateTime)}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'tripMovement',
    header: 'Trip / Movement',
    cell: (info) => {
      const r = info.row.original
      const cls = TRIP_TYPE_BADGE[r.tripType] ?? 'bg-gray-100 text-gray-600'
      return (
        <div className="flex flex-col gap-0.5">
          <span className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {r.tripType}
          </span>
          <span className="text-xs text-gray-400">{r.movementCode || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'bookingContainer',
    header: 'Booking / Container',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.bookingBLNo || '—'}</span>
          <span className="text-xs text-gray-400">
            {r.containerNo ? `${r.containerNo}${r.containerSize ? ` (${r.containerSize})` : ''}` : '—'}
          </span>
        </div>
      )
    },
  }),
  col.display({
    id: 'agentOrder',
    header: 'Agent / Order',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.agentCode || '—'}</span>
          <span className="text-xs text-gray-400">{r.orderNo || '—'}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'duration',
    header: 'Duration',
    size: 100,
    cell: (info) => {
      const { durationMins } = info.row.original
      return (
        <span className="text-sm text-gray-700">
          {durationMins != null ? `${durationMins} min` : '—'}
        </span>
      )
    },
  }),
]

interface TruckMovementClientProps {
  data: TruckMovement[]
}

export function TruckMovementClient({ data }: TruckMovementClientProps) {
  return <DataTable data={data} columns={columns} pageSize={15} />
}
