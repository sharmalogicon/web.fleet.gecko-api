'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { AccidentReport } from '@/types/accident-report'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockAccidentReport } from '@/lib/mock/accident-reports'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<AccidentReport>()

const TYPE_COLORS: Record<string, string> = {
  COLLISION: 'bg-orange-100 text-orange-700',
  ROLLOVER: 'bg-red-100 text-red-700',
  FIRE: 'bg-red-200 text-red-800',
  THEFT: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

interface AccidentListClientProps {
  initialData: AccidentReport[]
}

export function AccidentListClient({ initialData }: AccidentListClientProps) {
  const [data, setData] = useState<AccidentReport[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<AccidentReport | null>(null)
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
              onClick={() => router.push(`/fleet/accidents/${r.accidentID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{r.accidentDate}</span>
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
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode}</span>
            {r.driverName && (
              <span className="text-xs text-gray-400">{r.driverName}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'typeLocation',
      header: 'Type / Location',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[r.accidentType] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {r.accidentType}
            </span>
            {r.accidentLocation && (
              <span className="text-xs text-gray-400 truncate max-w-[180px]">
                {r.accidentLocation}
              </span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'insurance',
      header: 'Insurance',
      cell: (info) => {
        const r = info.row.original
        const hasPolicy = r.insPolicyNo || r.refClaimNo
        if (!hasPolicy) return <span className="text-sm text-gray-400">—</span>
        return (
          <div className="flex flex-col gap-0.5">
            {r.insPolicyNo && (
              <span className="text-sm text-gray-900">{r.insPolicyNo}</span>
            )}
            {r.refClaimNo && (
              <span className="text-xs text-gray-400">{r.refClaimNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'claimableActions',
      header: 'Claimable / Actions',
      size: 150,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${
                r.insClaimable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r.insClaimable ? 'Claimable' : 'Not Claimable'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/accidents/${r.accidentID}`)}
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
      removeMockAccidentReport(deleteTarget.accidentID)
      setData((prev) => prev.filter((r) => r.accidentID !== deleteTarget.accidentID))
      success('Accident report deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Accident Report"
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
