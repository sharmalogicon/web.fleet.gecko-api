'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { TireMaintenance } from '@/types/tire-maintenance'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToastStore } from '@/lib/stores/useToastStore'
import { removeMockTireMaintenance } from '@/lib/mock/tire-maintenance'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<TireMaintenance>()

interface TireMaintenanceListClientProps {
  initialData: TireMaintenance[]
}

export function TireMaintenanceListClient({ initialData }: TireMaintenanceListClientProps) {
  const [data, setData] = useState<TireMaintenance[]>(initialData)
  const [deleteTarget, setDeleteTarget] = useState<TireMaintenance | null>(null)
  const router = useRouter()
  const { success, error } = useToastStore()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'docNoDate',
      header: () => t('common.docDate'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/tires/maintenance/${r.maintenanceID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.documentNo}
            </button>
            <span className="text-xs text-gray-400">{r.documentDate}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vendorEquipment',
      header: 'Vendor / Equipment',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.vendorName}</span>
            {r.equipmentCode && (
              <span className="text-xs text-gray-400">{r.equipmentCode}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'inspectorRequired',
      header: 'Inspector / Required',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.inspector ?? '—'}</span>
            {r.requiredDate && (
              <span className="text-xs text-gray-400">{r.requiredDate}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amount',
      header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {r.nettAmount != null
                ? `฿${r.nettAmount.toLocaleString()}`
                : `฿${r.totalAmount.toLocaleString()}`}
            </span>
            {r.vat != null && (
              <span className="text-xs text-gray-400">VAT {r.vat}%</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 110,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/fleet/tires/maintenance/${r.maintenanceID}`)}
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
    try {
      removeMockTireMaintenance(deleteTarget.maintenanceID)
      setData((prev) => prev.filter((r) => r.maintenanceID !== deleteTarget.maintenanceID))
      success('Maintenance record deleted', `${deleteTarget.documentNo} has been removed.`)
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
        title="Delete Maintenance Record"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.documentNo}"? This action cannot be undone.`
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
