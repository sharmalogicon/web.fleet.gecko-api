'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { Driver } from '@/types/driver'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockDriver } from '@/lib/mock/drivers'
import { formatDate, isDateExpired } from '@/lib/utils/driver'

const col = createColumnHelper<Driver>()

const STRINGS = {
  deleteTitle: 'Delete Driver',
  deleteMessage: (name: string) => `Are you sure you want to delete "${name}"? This action cannot be undone.`,
  deleteSuccess: 'Driver deleted',
  deleteSuccessMsg: (name: string) => `${name} has been removed.`,
  deleteFailed: 'Delete failed',
  deleteFailedMsg: 'An error occurred. Please try again.',
} as const

interface DriversListClientProps {
  initialData: Driver[]
}

export function DriversListClient({ initialData }: DriversListClientProps) {
  const [data, setData] = useState<Driver[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()

  const columns = [
    col.accessor('driverCode', {
      header: 'Code',
      size: 100,
      cell: (info) => (
        <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>
      ),
    }),
    col.accessor('driverName', {
      header: 'Name',
      cell: (info) => (
        <button
          type="button"
          onClick={() => router.push(`/master/drivers/${info.row.original.driverID}`)}
          className="text-blue-600 hover:underline text-left font-medium"
        >
          {info.getValue()}
        </button>
      ),
    }),
    col.accessor('licenseNo', {
      header: 'License No.',
      cell: (info) => info.getValue() || '—',
    }),
    col.accessor('licenseExpiryDate', {
      header: 'License Expiry',
      cell: (info) => {
        const val = info.getValue()
        const expired = isDateExpired(val)
        return (
          <span className={expired ? 'text-red-600 font-medium' : ''}>
            {formatDate(val)}
          </span>
        )
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
            onClick={() => router.push(`/master/drivers/${info.row.original.driverID}`)}
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
    const name = deleteTarget.driverName
    try {
      removeMockDriver(deleteTarget.driverID)
      setData((prev) => prev.filter((d) => d.driverID !== deleteTarget.driverID))
      success(STRINGS.deleteSuccess, STRINGS.deleteSuccessMsg(name))
    } catch {
      error(STRINGS.deleteFailed, STRINGS.deleteFailedMsg)
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <DataTable data={data} columns={columns} pageSize={15} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={STRINGS.deleteTitle}
        message={deleteTarget ? STRINGS.deleteMessage(deleteTarget.driverName) : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
