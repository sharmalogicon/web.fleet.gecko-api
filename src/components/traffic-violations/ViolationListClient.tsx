'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { TrafficViolation, ViolationType } from '@/types/traffic-violation'
import { VIOLATION_TYPE_MAP } from '@/types/traffic-violation'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockTrafficViolation } from '@/lib/mock/traffic-violations'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<TrafficViolation>()

const TYPE_COLORS: Record<ViolationType, string> = {
  SPEEDING: 'bg-red-100 text-red-700',
  PARKING: 'bg-yellow-100 text-yellow-700',
  RED_LIGHT: 'bg-orange-100 text-orange-700',
  NO_SEATBELT: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

interface ViolationListClientProps {
  initialData: TrafficViolation[]
}

export function ViolationListClient({ initialData }: ViolationListClientProps) {
  const [data, setData] = useState<TrafficViolation[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<TrafficViolation | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'ticketNoDate',
      header: 'Ticket No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/traffic-violations/${r.violationID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.ticketNo}
            </button>
            <span className="text-xs text-gray-400">{r.violationDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'equipmentDriver',
      header: 'Equipment / Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode || '—'}</span>
            {r.driverName && (
              <span className="text-xs text-gray-400">{r.driverName}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'type',
      header: () => t('common.type'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[r.violationType]}`}
            >
              {VIOLATION_TYPE_MAP[r.violationType]}
            </span>
            {r.violationTypeDescription && (
              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                {r.violationTypeDescription}
              </span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amountActions',
      header: 'Amount / Actions',
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900 font-mono">
              ฿{r.violationAmount.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/traffic-violations/${r.violationID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(r)}
                className="text-xs text-red-500 hover:underline"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      removeMockTrafficViolation(deleteTarget.violationID)
      setData((prev) => prev.filter((r) => r.violationID !== deleteTarget.violationID))
      success('Traffic violation deleted', `${deleteTarget.ticketNo} has been removed.`)
    } catch {
      error('Delete failed', 'An error occurred. Please try again.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Traffic Violation"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.ticketNo}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
