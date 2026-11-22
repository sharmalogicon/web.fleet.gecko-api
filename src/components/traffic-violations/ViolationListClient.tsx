'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { fmtDate } from '@/components/docs/DocBits'
import { VIOLATION_STATUS_TONE, type ViolationRow } from '@/lib/api/fleet/trafficViolations'
import { useLookup } from '@/lib/api/fleet/lookups'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<ViolationRow>()

const TYPE_COLORS: Record<string, string> = {
  SPEEDING: 'bg-red-100 text-red-700',
  PARKING: 'bg-yellow-100 text-yellow-700',
  RED_LIGHT: 'bg-orange-100 text-orange-700',
  NO_SEATBELT: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

/** Same columns; the API status under the amount; no Delete (a violation is cancelled). */
export function ViolationListClient({ data }: { data: ViolationRow[] }) {
  const router = useRouter()
  const { t } = useT()
  const types = useLookup('violation-types')

  const columns = [
    col.display({
      id: 'ticketNoDate',
      header: 'Ticket No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/traffic-violations/${r.violationID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.ticketNo}
            </button>
            <span className="text-xs text-gray-400">{r.documentNo} · {fmtDate(r.violationDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'equipmentDriver',
      header: 'Equipment / Driver',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">{r.equipmentCode || '—'}</span>
            {r.driverName && (
              <span className="text-xs text-gray-400">{r.driverName}</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'type',
      header: () => t('common.type'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-block self-start px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[r.violationType] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {types.labelOf(r.violationType)}
            </span>
            {r.violationTypeDescription && (
              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                {r.violationTypeDescription}
              </span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'amountActions',
      header: 'Amount / Actions',
      size: 160,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900 font-mono">
              ฿{r.violationAmount.toLocaleString()}
            </span>
            <span className={`inline-flex w-fit px-1.5 rounded text-[10px] font-medium ${VIOLATION_STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-600'}`}>{t(`violation.status.${r.status}`)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/fleet/traffic-violations/${r.violationID}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
