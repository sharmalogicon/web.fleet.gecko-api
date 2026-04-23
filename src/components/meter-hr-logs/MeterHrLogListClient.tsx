'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { MeterHrLog } from '@/types/meter-hr-log'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockMeterHrLog } from '@/lib/mock/meter-hr-logs'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<MeterHrLog>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface MeterHrLogListClientProps {
  initialData: MeterHrLog[]
}

export function MeterHrLogListClient({ initialData }: MeterHrLogListClientProps) {
  const [data, setData] = useState<MeterHrLog[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<MeterHrLog | null>(null)
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
              onClick={() => router.push(`/fleet/meter-hr-logs/${r.meterHrLogID}`)}
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
      id: 'seqDate',
      header: 'Seq / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.sequenceNo || '—'}</span>
            <span className="text-xs text-gray-400">{formatDate(r.meterUpdateDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'driverType',
      header: 'Driver / Type',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
            <span className="text-xs text-gray-400">{r.meterType}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'distanceHours',
      header: 'Distance / Hours',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {r.distanceTravel != null ? `${r.distanceTravel.toLocaleString()} km` : '—'}
            </span>
            <span className="text-xs text-gray-400">
              {r.totalWorkingHr != null ? `${r.totalWorkingHr} hrs` : '—'}
            </span>
          </div>
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
              onClick={() => router.push(`/fleet/meter-hr-logs/${r.meterHrLogID}`)}
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
    const label = deleteTarget.sequenceNo || `MH-${deleteTarget.meterHrLogID}`
    try {
      removeMockMeterHrLog(deleteTarget.meterHrLogID)
      setData((prev) => prev.filter((r) => r.meterHrLogID !== deleteTarget.meterHrLogID))
      success('Meter hour log deleted', `${label} has been removed.`)
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
        title="Delete Meter Hour Log"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.sequenceNo || `MH-${deleteTarget.meterHrLogID}`}"? This action cannot be undone.`
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
