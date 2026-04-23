'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { WorkOrder } from '@/types/work-order'
import { WO_BADGE, PRIORITY_BADGE } from '@/types/work-order'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockWorkOrder } from '@/lib/mock/work-orders'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<WorkOrder>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(val?: number): string {
  if (val == null) return '—'
  return `฿${val.toLocaleString()}`
}

interface WorkOrderListClientProps {
  initialData: WorkOrder[]
}

export function WorkOrderListClient({ initialData }: WorkOrderListClientProps) {
  const [data, setData] = useState<WorkOrder[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'workOrder',
      header: 'Work Order',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/work-orders/${r.woID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo || `WO-${r.woID}`}
            </button>
            <span className="text-xs text-gray-400">
              {r.equipmentCode || '—'} · {formatDate(r.orderDate)}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'serviceCustomer',
      header: 'Service / Customer',
      cell: (info) => {
        const r = info.row.original
        const secondary = r.billingCustomerName || r.vendorName
        return (
          <div className="flex flex-col gap-0.5">
            {r.serviceTypeCategory && (
              <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                {r.serviceTypeCategory}
              </span>
            )}
            {secondary && <span className="text-xs text-gray-400">{secondary}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const r = info.row.original
        const priorityClass = PRIORITY_BADGE[r.priority ?? ''] ?? 'bg-gray-100 text-gray-600'
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(r.grandTotal)}
            </span>
            {r.priority && (
              <span
                className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}
              >
                {r.priority}
              </span>
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
        const cls = WO_BADGE[status] ?? 'bg-gray-100 text-gray-600'
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
              onClick={() => router.push(`/fleet/work-orders/${r.woID}`)}
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
    const label = deleteTarget.documentNo || `WO-${deleteTarget.woID}`
    try {
      removeMockWorkOrder(deleteTarget.woID)
      setData((prev) => prev.filter((r) => r.woID !== deleteTarget.woID))
      success('Work order deleted', `${label} has been removed.`)
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
        title="Delete Work Order"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.documentNo || `WO-${deleteTarget.woID}`}"? This action cannot be undone.`
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
