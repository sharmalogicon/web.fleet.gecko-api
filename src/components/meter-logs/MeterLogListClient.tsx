'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { MeterReadingActions, MeterStatusBadge } from '@/components/meters/MeterBits'
import type { MeterReadingView } from '@/lib/api/fleet/meters'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<MeterReadingView>()

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const METER_TYPE_COLORS: Record<string, string> = {
  KM: 'bg-blue-100 text-blue-700',
  HOUR: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-green-100 text-green-700',
}

interface MeterLogListClientProps {
  data: MeterReadingView[]
}

/** Same columns; rows = meter readings (API). Status badge in the value cell; no edit / delete (a reading is reversed). */
export function MeterLogListClient({ data }: MeterLogListClientProps) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: MeterReadingView) => router.push(`/fleet/meter-logs/${r.id}`)

  const columns = [
    col.display({
      id: 'equipment',
      header: () => t('common.equipment'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">
              {r.equipmentCode}
            </button>
            {r.registrationNo && <span className="text-xs text-gray-400">{r.registrationNo}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'dateType',
      header: 'Date / Type',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{formatDate(r.meterUpdateDate)}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${METER_TYPE_COLORS[r.meterType] ?? 'bg-gray-100 text-gray-600'}`}>
              {r.meterType}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'readings',
      header: 'Readings',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {r.meterType === 'KM' ? `${r.value.toLocaleString()} km` : `${r.value.toLocaleString()} hrs`}
            </span>
            <span className="text-xs text-gray-400">{r.sinceLast != null ? `+${r.sinceLast.toLocaleString()}` : '—'}</span>
            <MeterStatusBadge status={r.status} reason={r.suspectReason} />
          </div>
        )
      },
    }),
    col.display({
      id: 'driver',
      header: () => t('common.driver'),
      cell: (info) => <span className="text-sm text-gray-900">{info.row.original.driverName || '—'}</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 140,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button type="button" onClick={() => open(r)} className="text-xs text-blue-600 hover:underline">
              {t('common.view')}
            </button>
            <MeterReadingActions reading={r} />
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
