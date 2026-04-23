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
import { useT } from '@/i18n/I18nContext'

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
  const { t } = useT()

  const columns = [
    col.display({
      id: 'driver',
      header: 'Driver',
      cell: (info) => {
        const d = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/drivers/${d.driverID}`)}
              className="text-blue-600 hover:underline text-left font-medium"
            >
              {d.driverName}
            </button>
            <span className="text-xs text-gray-400 font-mono">{d.driverCode}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'license',
      header: 'License',
      cell: (info) => {
        const { licenseNo, licenseExpiryDate } = info.row.original
        const expired = isDateExpired(licenseExpiryDate)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{licenseNo || '—'}</span>
            <span className={`text-xs ${expired ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {licenseExpiryDate ? formatDate(licenseExpiryDate) : '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'contact',
      header: 'Contact',
      cell: (info) => {
        const { mobilePhoneNumber, phoneNumber } = info.row.original
        const phone = mobilePhoneNumber || phoneNumber
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{phone || '—'}</span>
            <span className="text-xs text-gray-400">{info.row.original.position || ''}</span>
          </div>
        )
      },
    }),
    col.accessor('status', {
      header: () => t('common.status'),
      size: 120,
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
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </>
  )
}
