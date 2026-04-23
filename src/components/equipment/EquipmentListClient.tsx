'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { Equipment } from '@/types/equipment'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockEquipment } from '@/lib/mock/equipment'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<Equipment>()

interface EquipmentListClientProps {
  initialData: Equipment[]
}

export function EquipmentListClient({ initialData }: EquipmentListClientProps) {
  const [data, setData] = useState<Equipment[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const e = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/equipment/${e.equipmentID}`)}
              className="text-blue-600 hover:underline text-left font-medium font-mono"
            >
              {e.code}
            </button>
            <span className="text-xs text-gray-400">{e.registrationNo || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'type',
      header: 'Category / Brand',
      cell: (info) => {
        const { category, brand, model } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{category || '—'}</span>
            <span className="text-xs text-gray-400">
              {[brand, model].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'meter',
      header: 'Meter',
      cell: (info) => {
        const { currentMeter, meterType } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">
              {currentMeter != null ? currentMeter.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-gray-400">{meterType || ''}</span>
          </div>
        )
      },
    }),
    col.accessor('status', {
      header: () => t('common.status'),
      size: 130,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 80,
      cell: (info) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.push(`/master/equipment/${info.row.original.equipmentID}`)}
            className="text-xs text-blue-600 hover:underline"
          >
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(info.row.original)}
            className="text-xs text-red-500 hover:underline"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    }),
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    const name = deleteTarget.code
    try {
      removeMockEquipment(deleteTarget.equipmentID)
      setData((prev) => prev.filter((e) => e.equipmentID !== deleteTarget.equipmentID))
      success('Equipment deleted', `${name} has been removed.`)
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
        title="Delete Equipment"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.code}"? This action cannot be undone.`
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
