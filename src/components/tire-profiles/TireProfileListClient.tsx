'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { TireProfile } from '@/types/tire-profile'
import type { TyreStatus } from '@/types/tire-profile'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockTireProfile } from '@/lib/mock/tire-profiles'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<TireProfile>()

const STATUS_BADGE: Record<TyreStatus, { bg: string; text: string }> = {
  NEW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  USED: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  RECAP: { bg: 'bg-orange-100', text: 'text-orange-700' },
  SCRAP: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

function TyreStatusBadge({ status }: { status: TyreStatus }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.NEW
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
    >
      {status}
    </span>
  )
}

interface TireProfileListClientProps {
  initialData: TireProfile[]
}

export function TireProfileListClient({ initialData }: TireProfileListClientProps) {
  const [data, setData] = useState<TireProfile[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<TireProfile | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'serialBrand',
      header: 'Serial / Brand',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/tires/profiles/${r.tireProfileID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.serialNo}
            </button>
            <span className="text-xs text-gray-400">{r.brand}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'sizeModel',
      header: 'Size / Model',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900">{r.tyreSize}</span>
            {r.model && <span className="text-xs text-gray-400">{r.model}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'statusCondition',
      header: 'Status / Condition',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <TyreStatusBadge status={r.tyreStatus as TyreStatus} />
            <span className="text-xs text-gray-400">{r.condition}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        if (!r.equipmentCode) {
          return <span className="text-sm text-gray-400">—</span>
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode}</span>
            {r.tyrePosition && (
              <span className="text-xs text-gray-400">
                {r.tyrePosition.replace(/_/g, ' ')}
              </span>
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
              onClick={() => router.push(`/fleet/tires/profiles/${r.tireProfileID}`)}
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
      removeMockTireProfile(deleteTarget.tireProfileID)
      setData((prev) => prev.filter((r) => r.tireProfileID !== deleteTarget.tireProfileID))
      success('Tire profile deleted', `${deleteTarget.serialNo} has been removed.`)
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
        title="Delete Tire Profile"
        message={
          deleteTarget
            ? `Are you sure you want to delete tire "${deleteTarget.serialNo}"? This action cannot be undone.`
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
