'use client'

import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import type { ServiceTypeView } from '@/lib/api/fleet/serviceTasks'
import { DataTable } from '@/components/shared/DataTable'
import { useT } from '@/i18n/I18nContext'

const col = createColumnHelper<ServiceTypeView>()

interface ServiceTypeListClientProps {
  data: ServiceTypeView[]
}

/** Same columns; rows = Fleet service tasks. No delete: a task is switched off (Active unticked). */
export function ServiceTypeListClient({ data }: ServiceTypeListClientProps) {
  const router = useRouter()
  const { t } = useT()

  const columns = [
    col.display({
      id: 'codeService',
      header: 'Code / Service',
      cell: (info) => {
        const s = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => router.push(`/fleet/service-types/${s.id}`)}
              className="text-blue-600 hover:underline text-left text-sm font-medium font-mono"
            >
              {s.code}
            </button>
            <span className="text-xs text-gray-400">{s.description}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'categoryStatus',
      header: 'Category / Status',
      cell: (info) => {
        const { serviceCategory, isActive } = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{serviceCategory || '—'}</span>
            <span
              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        )
      },
    }),
    col.display({
      id: 'durationNotify',
      header: 'Duration / Notify',
      cell: (info) => {
        const { estimationDuration, advanceNotifyDay, advanceNotifyKM } = info.row.original
        const notifyParts: string[] = []
        if (advanceNotifyDay) notifyParts.push(`${advanceNotifyDay}d`)
        if (advanceNotifyKM) notifyParts.push(`${advanceNotifyKM}km`)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {estimationDuration != null ? `${estimationDuration}h` : '—'}
            </span>
            <span className="text-xs text-gray-400">
              {notifyParts.length > 0 ? `Notify: ${notifyParts.join(' / ')}` : 'No notify'}
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
        const s = info.row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/fleet/service-types/${s.id}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('common.edit')}
            </button>
            {/* No delete in the API: untick Active instead (prompt 07). */}
          </div>
        )
      },
    }),
  ]

  return <DataTable data={data} columns={columns} pageSize={15} />
}
