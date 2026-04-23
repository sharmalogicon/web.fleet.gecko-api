'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { FuelLog } from '@/types/fuel-log'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockFuelLog } from '@/lib/mock/fuel-logs'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<FuelLog>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(val?: number): string {
  if (val == null) return '—'
  return `฿${val.toLocaleString()}`
}

interface FuelLogListClientProps {
  initialData: FuelLog[]
}

export function FuelLogListClient({ initialData }: FuelLogListClientProps) {
  const [data, setData] = useState<FuelLog[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<FuelLog | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/fuel-logs/${r.fuelLogID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.equipmentCode}
            </button>
            {r.registrationNo && (
              <span className="text-xs text-gray-400">{r.registrationNo}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'voucherDate',
      header: 'Voucher / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.voucherNo || '—'}</span>
            <span className="text-xs text-gray-400">{formatDate(r.meterUpdateDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'driver',
      header: 'Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
            {r.driverCard && (
              <span className="text-xs text-gray-400">{r.driverCard}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'fuel',
      header: 'Fuel',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.tankMeter} L</span>
            <span className="text-xs text-gray-400">
              {r.costPerLiter != null ? `฿${r.costPerLiter}/L` : '—'}
              {r.totalAmount != null ? ` · ${formatCurrency(r.totalAmount)}` : ''}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'status',
      header: () => t('common.status'),
      cell: (info) => {
        const { isApproved } = info.row.original
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isApproved ? 'Approved' : 'Pending'}
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
              onClick={() => router.push(`/fleet/fuel-logs/${r.fuelLogID}`)}
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
    const label = deleteTarget.voucherNo || `FL-${deleteTarget.fuelLogID}`
    try {
      removeMockFuelLog(deleteTarget.fuelLogID)
      setData((prev) => prev.filter((r) => r.fuelLogID !== deleteTarget.fuelLogID))
      success('Fuel log deleted', `${label} has been removed.`)
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
        title="Delete Fuel Log"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.voucherNo || `FL-${deleteTarget.fuelLogID}`}"? This action cannot be undone.`
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
