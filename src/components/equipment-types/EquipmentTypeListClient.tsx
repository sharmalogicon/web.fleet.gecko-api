'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { EquipmentTypeRecord } from '@/types/equipment-type'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockEquipmentType } from '@/lib/mock/equipment-types'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<EquipmentTypeRecord>()

interface Props {
  initialData: EquipmentTypeRecord[]
}

export function EquipmentTypeListClient({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [deleteTarget, setDeleteTarget] = useState<EquipmentTypeRecord | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'typeSize',
      header: 'Type / Size',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/equipment-types/${r.equipmentTypeSizeID}`)}
              className="text-blue-600 hover:underline text-left font-medium font-mono"
            >
              {r.equipmentTypeSize}
            </button>
            <span className="text-xs text-gray-400">{r.description}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'isoTeu',
      header: 'ISO / TEU',
      cell: (info) => {
        const { isoCode, teu } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{isoCode || '—'}</span>
            <span className="text-xs text-gray-400">{teu ? `TEU: ${teu}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'weight',
      header: 'Gross / Tare (kg)',
      cell: (info) => {
        const { grossWeight, tareWeight } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{grossWeight != null ? grossWeight.toLocaleString() : '—'}</span>
            <span className="text-xs text-gray-400">{tareWeight != null ? `Tare: ${tareWeight.toLocaleString()}` : ''}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'flags',
      header: 'Flags',
      size: 120,
      cell: (info) => {
        const { isContainer, isReefer } = info.row.original
        return (
          <div className="flex flex-wrap gap-1">
            {isContainer && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Container
              </span>
            )}
            {isReefer && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                Reefer
              </span>
            )}
            {!isContainer && !isReefer && <span className="text-xs text-gray-400">—</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 80,
      cell: (info) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => router.push(`/master/equipment-types/${info.row.original.equipmentTypeSizeID}`)}
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
    try {
      removeMockEquipmentType(deleteTarget.equipmentTypeSizeID)
      setData((prev) => prev.filter((r) => r.equipmentTypeSizeID !== deleteTarget.equipmentTypeSizeID))
      success('Deleted', `${deleteTarget.equipmentTypeSize} has been removed.`)
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
        title="Delete Equipment Type"
        message={deleteTarget ? `Delete "${deleteTarget.equipmentTypeSize}"?` : ''}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
