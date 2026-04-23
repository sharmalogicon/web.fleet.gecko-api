'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { WorkRequest } from '@/types/work-request'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockWorkRequest } from '@/lib/mock/work-requests'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<WorkRequest>()

const WR_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  'IN PROGRESS': 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
  NORMAL: 'bg-gray-100 text-gray-600',
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface WorkRequestListClientProps {
  initialData: WorkRequest[]
}

export function WorkRequestListClient({ initialData }: WorkRequestListClientProps) {
  const [data, setData] = useState<WorkRequest[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<WorkRequest | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'request',
      header: 'Request',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/work-requests/${r.wrID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo || `WR-${r.wrID}`}
            </button>
            <span className="text-xs text-gray-400">{formatDate(r.orderDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'equipmentCustomer',
      header: 'Equipment / Customer',
      cell: (info) => {
        const r = info.row.original
        const secondary = r.billingCustomerName || r.vendorName
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{r.equipmentCode || '—'}</span>
            {secondary && <span className="text-xs text-gray-400">{secondary}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'priorityDescription',
      header: 'Priority / Description',
      cell: (info) => {
        const r = info.row.original
        const priorityClass =
          PRIORITY_BADGE[r.priorityType ?? ''] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5">
            {r.priorityType && (
              <span
                className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}
              >
                {r.priorityType}
              </span>
            )}
            {r.description && (
              <span className="text-xs text-gray-400 truncate max-w-xs">{r.description}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const { status } = info.row.original
        const cls = WR_BADGE[status] ?? 'bg-gray-100 text-gray-600'
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
          >
            {status}
          </span>
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
              onClick={() => router.push(`/fleet/work-requests/${r.wrID}`)}
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
    const label = deleteTarget.documentNo || `WR-${deleteTarget.wrID}`
    try {
      removeMockWorkRequest(deleteTarget.wrID)
      setData((prev) => prev.filter((r) => r.wrID !== deleteTarget.wrID))
      success('Work request deleted', `${label} has been removed.`)
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
        title="Delete Work Request"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.documentNo || `WR-${deleteTarget.wrID}`}"? This action cannot be undone.`
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
