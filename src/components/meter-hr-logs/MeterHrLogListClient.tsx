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
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

interface MeterHrLogListClientProps {
  data: MeterReadingView[]
}

/** Same columns; rows = hour-meter readings (API). "Seq" shows the reading's time (no sequence no. in the API). */
export function MeterHrLogListClient({ data }: MeterHrLogListClientProps) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: MeterReadingView) => router.push(`/fleet/meter-hr-logs/${r.id}`)

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
      id: 'seqDate',
      header: 'Seq / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{formatTime(r.meterUpdateDate)}</span>
            <span className="text-xs text-gray-400">{formatDate(r.meterUpdateDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'driverType',
      header: 'Driver / Type',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{r.driverName || '—'}</span>
            <span className="text-xs text-gray-400">{r.meterType}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'distanceHours',
      header: 'Distance / Hours',
      cell: (info) => {
        const r = info.row.original
        const unit = r.meterType === 'KM' ? 'km' : 'hrs'
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{`${r.value.toLocaleString()} ${unit}`}</span>
            <span className="text-xs text-gray-400">{r.sinceLast != null ? `+${r.sinceLast.toLocaleString()} ${unit}` : '—'}</span>
            <MeterStatusBadge status={r.status} reason={r.suspectReason} />
          </div>
        )
      },
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
