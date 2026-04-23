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

function calcDaysOpen(dateStr?: string): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
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
    id: 'equipmentCustomer',
    header: 'Equipment / Customer',
    cell: (info) => {
      const r = info.row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-900">{r.equipmentCode || '—'}</span>
          <span className="text-xs text-gray-400">{r.billingCustomerName || '—'}</span>
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
    id: 'daysOpen',
    header: 'Days Open',
    cell: (info) => {
      const r = info.row.original
      const days = calcDaysOpen(r.orderDate)
      return (
        <div className="flex flex-col gap-0.5">
          <span className={`text-sm font-medium ${days > 7 ? 'text-orange-500' : 'text-gray-900'}`}>
            {days} day{days !== 1 ? 's' : ''}
          </span>
          <span className={`text-xs ${days > 7 ? 'text-orange-400' : 'text-gray-400'}`}>
            since {formatDate(r.orderDate)}
          </span>
        </div>
      )
    },
  }),
]

interface WIPInquiryClientProps {
  data: WorkOrder[]
}

export function WIPInquiryClient({ data }: WIPInquiryClientProps) {
  return <DataTable data={data} columns={columns} pageSize={15} />
}
