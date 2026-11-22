'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { activeAssignments, type PmProgramDto } from '@/lib/api/fleet/pm'
import { useT } from '@/i18n/I18nContext'

/** The old row shape, from a PM program. */
interface PMRow {
  pmID: string
  scheduleNo: string
  scheduleDate?: string
  serviceTypeDescription: string
  meterKm?: number
  isActive: boolean
  equipment: unknown[]
}

const toRow = (d: PmProgramDto): PMRow => ({
  pmID: d.pmProgramId,
  scheduleNo: d.programCode,
  scheduleDate: d.effectiveDate ?? undefined,
  serviceTypeDescription: d.nameEn,
  meterKm: d.defaultIntervalKm == null ? undefined : Number(d.defaultIntervalKm),
  isActive: d.isActive,
  equipment: activeAssignments(d),
})

const col = createColumnHelper<PMRow>()

interface PMScheduleListClientProps {
  data: PmProgramDto[]
}

/** Same columns; rows = PM programs (API). No delete: untick Active. */
export function PMScheduleListClient({ data }: PMScheduleListClientProps) {
  const router = useRouter()
  const { t } = useT()
  const rows = data.map(toRow)

  const columns = [
    col.display({
      id: 'schedule',
      header: 'Schedule',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/pm-scheduler/${r.pmID}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {r.scheduleNo || `PM-${r.pmID}`}
            </button>
            <span className="text-xs text-gray-400">{r.scheduleDate || '—'}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'serviceType',
      header: () => t('form.serviceType'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">
              {r.serviceTypeDescription || '—'}
            </span>
            {r.meterKm != null && (
              <span className="text-xs text-gray-400">Meter: {r.meterKm.toLocaleString()} km</span>
            )}
          </div>
        )
      },
    }),
    col.display({
      id: 'equipment',
      header: () => t('common.equipment'),
      cell: (info) => {
        const r = info.row.original
        const count = r.equipment?.length ?? 0
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900">{count} unit{count !== 1 ? 's' : ''}</span>
            <span
              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                r.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {r.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
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
              onClick={() => router.push(`/fleet/pm-scheduler/${r.pmID}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            {/* No delete in the API (prompt 08). */}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={rows} columns={columns} pageSize={15} />
}
