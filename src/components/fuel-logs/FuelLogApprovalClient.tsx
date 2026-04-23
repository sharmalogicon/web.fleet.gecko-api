'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import type { FuelLog } from '@/types/fuel-log'
import { DataTable } from '@/components/shared/DataTable'
import { useToastStore } from '@/lib/stores/useToastStore'
import { upsertMockFuelLog } from '@/lib/mock/fuel-logs'
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

interface FuelLogApprovalClientProps {
  initialData: FuelLog[]
}

export function FuelLogApprovalClient({ initialData }: FuelLogApprovalClientProps) {
  const { t } = useT()
  const [data, setData] = useState<FuelLog[]>(initialData)
  const { success, error } = useToastStore()

  const handleApprove = (fuelLog: FuelLog) => {
    try {
      const updated: FuelLog = {
        ...fuelLog,
        isApproved: true,
        approvedBy: 'current_user',
        approvedOn: new Date().toISOString().split('T')[0],
      }
      upsertMockFuelLog(updated)
      setData((prev) => prev.filter((r) => r.fuelLogID !== fuelLog.fuelLogID))
      success('Approved', `${fuelLog.voucherNo || `FL-${fuelLog.fuelLogID}`} has been approved.`)
    } catch {
      error('Approval failed', 'An error occurred. Please try again.')
    }
  }

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium font-mono text-gray-900">{r.equipmentCode}</span>
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
            {r.driverCard && <span className="text-xs text-gray-400">{r.driverCard}</span>}
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
      header: 'Status',
      cell: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
          Pending
        </span>
      ),
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 110,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleApprove(r)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              {t('common.approve')}
            </button>
          </div>
        )
      },
    }),
  ]

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <p className="text-gray-500 text-sm">No pending fuel logs to approve.</p>
      </div>
    )
  }

  return <DataTable data={data} columns={columns} pageSize={15} />
}
