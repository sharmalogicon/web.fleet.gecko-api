'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { SparePartsMonitor, SparePartsMonitorStatus } from '@/types/spare-parts-monitor'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<SparePartsMonitor>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const STATUS_BADGE_CLASSES: Record<SparePartsMonitorStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }: { status: SparePartsMonitorStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

const columns: import('@tanstack/react-table').ColumnDef<SparePartsMonitor, any>[] = [
  col.display({
    id: 'woEquipment',
    header: 'WO / Equipment',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium font-mono text-gray-900">{r.workOrderNo}</span>
          <span className="text-xs text-gray-400">{r.equipmentCode}</span>
        </div>
      )
    },
  }),
  col.display({
    id: 'orderDateTime',
    header: 'Order Date / Time',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{formatDate(r.orderDate)}</span>
          {r.orderTime && (
            <span className="text-xs text-gray-400">{r.orderTime}</span>
          )}
        </div>
      )
    },
  }),
  col.display({
    id: 'grandTotal',
    header: 'Grand Total',
    size: 130,
    cell: (info) => (
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCurrency(info.row.original.grandTotal)}
      </span>
    ),
  }),
  col.display({
    id: 'status',
    header: 'Status',
    size: 100,
    cell: (info) => <StatusBadge status={info.row.original.status} />,
  }),
  col.display({
    id: 'remarks',
    header: 'Remarks',
    cell: (info) => {
      const r = info.row.original
      const truncated =
        r.remarks && r.remarks.length > 60
          ? r.remarks.slice(0, 60) + '…'
          : r.remarks
      return (
        <span className="text-sm text-gray-700">{truncated || '—'}</span>
      )
    },
  }),
]

interface SparePartsMonitorClientProps {
  initialData: SparePartsMonitor[]
}

export function SparePartsMonitorClient({ initialData }: SparePartsMonitorClientProps) {
  return <DataTable data={initialData} columns={columns} pageSize={15} />
}
