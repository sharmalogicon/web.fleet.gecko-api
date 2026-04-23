'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { MeterLog } from '@/types/meter-log'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockMeterLog } from '@/lib/mock/meter-logs'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<MeterLog>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const METER_TYPE_COLORS: Record<string, string> = {
  KM: 'bg-blue-100 text-blue-700',
  HOUR: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-green-100 text-green-700',
}

interface MeterLogListClientProps {
  initialData: MeterLog[]
}

export function MeterLogListClient({ initialData }: MeterLogListClientProps) {
  const [data, setData] = useState<MeterLog[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<MeterLog | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/meter-logs/${r.meterLogID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.equipmentCode}
            </button>
            {r.registrationNo && (
              <span className="text-xs text-gray-400">{r.registrationNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'dateType',
      header: 'Date / Type',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{formatDate(r.meterUpdateDate)}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                METER_TYPE_COLORS[r.meterType] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {r.meterType}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'readings',
      header: 'Readings',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {r.meterRead.toLocaleString()} km
            </span>
            {r.hourMeter != null ? (
              <span className="text-xs text-gray-400">{r.hourMeter.toLocaleString()} hrs</span>
            ) : (
              <span className="text-xs text-gray-300">— hrs</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'driver',
      header: 'Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 100,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/meter-logs/${r.meterLogID}`)}
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
        )
      },
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    const label = `ML-${deleteTarget.meterLogID}`
    try {
      removeMockMeterLog(deleteTarget.meterLogID)
      setData((prev) => prev.filter((r) => r.meterLogID !== deleteTarget.meterLogID))
      success('Meter log deleted', `${label} has been removed.`)
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
        title="Delete Meter Log"
        message={
          deleteTarget
            ? `Are you sure you want to delete meter log for "${deleteTarget.equipmentCode}"? This action cannot be undone.`
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
