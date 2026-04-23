'use client'

import { createColumnHelper } from '@tanstack/react-table'
import type { PendingRecap } from '@/types/pending-recap'
import type { PendingRecapStatus } from '@/types/pending-recap'
import { DataTable } from '@/components/shared/DataTable'

const col = createColumnHelper<PendingRecap>()

const STATUS_BADGE: Record<PendingRecapStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

function RecapStatusBadge({ status }: { status: PendingRecapStatus }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.PENDING
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
    >
      {status}
    </span>
  )
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—'
  return '฿' + value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

interface PendingRecapClientProps {
  initialData: PendingRecap[]
}

export function PendingRecapClient({ initialData }: PendingRecapClientProps) {
  const columns = [
    col.display({
      id: 'taxNoDate',
      header: 'Tax No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.taxNo}</span>
            <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vendor',
      header: 'Vendor',
      cell: (info) => (
        <span className="text-sm text-gray-900">{info.row.original.vendorName}</span>
      ),
    }),
    col.display({
      id: 'serialSize',
      header: 'Serial / Size',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.serialNo}</span>
            <span className="text-xs text-gray-400">{r.tyreSize}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'brandCondition',
      header: 'Brand / Condition',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.brand}</span>
            <span className="text-xs text-gray-400">{r.condition}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'statusCost',
      header: 'Status / Cost',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <RecapStatusBadge status={r.status} />
            <span className="text-xs text-gray-500">{formatCurrency(r.recapCost)}</span>
          </div>
        )
      },
    }),
  ]

  return <DataTable data={initialData} columns={columns} pageSize={15} />
}
