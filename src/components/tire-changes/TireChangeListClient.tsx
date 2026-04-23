'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { TireChange } from '@/types/tire-change'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockTireChange } from '@/lib/mock/tire-changes'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<TireChange>()

interface TireChangeListClientProps {
  initialData: TireChange[]
}

export function TireChangeListClient({ initialData }: TireChangeListClientProps) {
  const [data, setData] = useState<TireChange[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<TireChange | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: 'Doc No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/tires/changes/${r.tireChangeID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{r.changeDate}</span>
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
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode}</span>
            {r.equipmentType && (
              <span className="text-xs text-gray-400">{r.equipmentType}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'driverWo',
      header: 'Driver / WO',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.driverName ?? '—'}</span>
            {r.workOrderNo && (
              <span className="text-xs text-gray-400">{r.workOrderNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'meterChangedBy',
      header: 'Meter / Changed By',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">
              {r.meterRead != null ? `${r.meterRead.toLocaleString()} km` : '—'}
            </span>
            {r.changeBy && (
              <span className="text-xs text-gray-400">{r.changeBy}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 110,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/fleet/tires/changes/${r.tireChangeID}`)}
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
    try {
      removeMockTireChange(deleteTarget.tireChangeID)
      setData((prev) => prev.filter((r) => r.tireChangeID !== deleteTarget.tireChangeID))
      success('Tire change deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Tire Change"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.documentNo}"? This action cannot be undone.`
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
