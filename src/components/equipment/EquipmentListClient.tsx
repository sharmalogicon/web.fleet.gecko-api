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

const col = createColumnHelper<Equipment>()

interface EquipmentListClientProps {
  initialData: Equipment[]
}

export function EquipmentListClient({ initialData }: EquipmentListClientProps) {
  const [data, setData] = useState<Equipment[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()

  const columns = [
    col.accessor('code', {
      header: 'Code',
      size: 100,
      cell: (info) => <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>,
    }),
    col.accessor('registrationNo', {
      header: 'Reg. No.',
      cell: (info) => info.getValue() || '—',
    }),
    col.accessor('category', {
      header: 'Category',
      cell: (info) => info.getValue() || '—',
    }),
    col.display({
      id: 'brandModel',
      header: 'Brand / Model',
      cell: (info) => {
        const { brand, model } = info.row.original
        if (!brand && !model) return '—'
        return `${brand ?? ''} ${model ?? ''}`.trim()
      },
    }),
    col.accessor('currentMeter', {
      header: 'Meter',
      cell: (info) => {
        const val = info.getValue()
        const type = info.row.original.meterType
        if (val == null) return '—'
        return `${val.toLocaleString()} ${type ?? ''}`
      },
    }),
    col.accessor('status', {
      header: 'Status',
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
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(info.row.original)}
            className="text-xs text-red-500 hover:underline"
          >
            Delete
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
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
