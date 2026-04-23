'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { ServiceType } from '@/types/service-type'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockServiceType } from '@/lib/mock/service-types'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<ServiceType>()

interface ServiceTypeListClientProps {
  initialData: ServiceType[]
}

export function ServiceTypeListClient({ initialData }: ServiceTypeListClientProps) {
  const [data, setData] = useState<ServiceType[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<ServiceType | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'codeService',
      header: 'Code / Service',
      cell: (info) => {
        const s = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/service-types/${s.serviceTypeID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {s.code}
            </button>
            <span className="text-xs text-gray-400">{s.description}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'categoryStatus',
      header: 'Category / Status',
      cell: (info) => {
        const { serviceCategory, isActive } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{serviceCategory || '—'}</span>
            <span
              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'durationNotify',
      header: 'Duration / Notify',
      cell: (info) => {
        const { estimationDuration, advanceNotifyDay, advanceNotifyKM } = info.row.original
        const notifyParts: string[] = []
        if (advanceNotifyDay) notifyParts.push(`${advanceNotifyDay}d`)
        if (advanceNotifyKM) notifyParts.push(`${advanceNotifyKM}km`)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {estimationDuration != null ? `${estimationDuration}h` : '—'}
            </span>
            <span className="text-xs text-gray-400">
              {notifyParts.length > 0 ? `Notify: ${notifyParts.join(' / ')}` : 'No notify'}
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
        const s = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/service-types/${s.serviceTypeID}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(s)}
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
    const name = deleteTarget.code
    try {
      removeMockServiceType(deleteTarget.serviceTypeID)
      setData((prev) => prev.filter((r) => r.serviceTypeID !== deleteTarget.serviceTypeID))
      success('Service type deleted', `${name} has been removed.`)
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
        title="Delete Service Type"
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
