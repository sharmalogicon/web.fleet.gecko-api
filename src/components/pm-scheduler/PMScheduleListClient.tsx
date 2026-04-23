'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { PMSchedule } from '@/types/pm-scheduler'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockPMSchedule } from '@/lib/mock/pm-scheduler'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<PMSchedule>()

interface PMScheduleListClientProps {
  initialData: PMSchedule[]
}

export function PMScheduleListClient({ initialData }: PMScheduleListClientProps) {
  const [data, setData] = useState<PMSchedule[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<PMSchedule | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'schedule',
      header: 'Schedule',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/pm-scheduler/${r.pmID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.scheduleNo || `PM-${r.pmID}`}
            </button>
            <span className="text-xs text-gray-400">{r.scheduleDate || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'serviceType',
      header: () => t('form.serviceType'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">
              {r.serviceTypeDescription || '—'}
            </span>
            {r.meterKm != null && (
              <span className="text-xs text-gray-400">Meter: {r.meterKm.toLocaleString()} km</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'equipment',
      header: () => t('common.equipment'),
      cell: (info) => {
        const r = info.row.original
        const count = r.equipment?.length ?? 0
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{count} unit{count !== 1 ? 's' : ''}</span>
            <span
              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                r.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r.isActive ? 'Active' : 'Inactive'}
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
              onClick={() => router.push(`/fleet/pm-scheduler/${r.pmID}`)}
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
    const label = deleteTarget.scheduleNo || `PM-${deleteTarget.pmID}`
    try {
      removeMockPMSchedule(deleteTarget.pmID)
      setData((prev) => prev.filter((r) => r.pmID !== deleteTarget.pmID))
      success('PM Schedule deleted', `${label} has been removed.`)
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
        title="Delete PM Schedule"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.scheduleNo || `PM-${deleteTarget.pmID}`}"? This action cannot be undone.`
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
