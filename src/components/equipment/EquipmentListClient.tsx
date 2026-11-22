'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { AssetView } from '@/lib/api/fleet/assets'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<AssetView>()

interface EquipmentListClientProps {
  data: AssetView[]
}

/** Same columns as before; rows come from the Fleet API (EquipmentListView). */
export function EquipmentListClient({ data }: EquipmentListClientProps) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'equipment',
      header: 'Equipment',
      cell: (info) => {
        const e = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/master/equipment/${e.id}`)}
              className="text-blue-600 hover:underline text-left font-medium font-mono"
            >
              {e.code}
            </button>
            <span className="text-xs text-gray-400">{e.registrationNo || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'type',
      header: 'Category / Brand',
      cell: (info) => {
        const { category, brand, model } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{category || '—'}</span>
            <span className="text-xs text-gray-400">
              {[brand, model].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'meter',
      header: 'Meter',
      cell: (info) => {
        const { currentMeter, meterType } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">
              {currentMeter != null ? currentMeter.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-gray-400">{meterType || ''}</span>
          </div>
        )
      },
    }),
    col.accessor('status', {
      header: () => t('common.status'),
      size: 130,
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
            onClick={() => router.push(`/master/equipment/${info.row.original.id}`)}
            className="text-xs text-blue-600 hover:underline"
          >
            {t('common.edit')}
          </button>
          {/* The asset register has no delete: an asset is switched off (Inactive / Disposed) instead. */}
          <button
            type="button"
            disabled
            title={t('equipment.noDelete')}
            className="text-xs text-red-500 opacity-40 cursor-not-allowed"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
