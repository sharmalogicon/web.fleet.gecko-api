'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { useT } from '@/i18n/I18nContext'
import { DEFECT_STATUSES, useDefects, type DefectDto } from '@/lib/api/fleet/inspections'
import { errorText } from '@/lib/api/errorText'
import { DefectActions, DefectStatus, SeverityBadge } from './DefectActions'

const col = createColumnHelper<DefectDto>()
const selectClass = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/** New page (prompt 10 §D). The API sorts OUT_OF_SERVICE first, newest first; default filter OPEN. */
export function DefectsListView({ status }: { status: string }) {
  const { t } = useT()
  const router = useRouter()
  const list = useDefects({ status: status !== 'ALL' ? status : undefined })
  const rows = list.data ?? []
  const columns = [
    col.display({
      id: 'asset', header: () => t('common.equipment'),
      cell: ({ row: { original: d } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-mono">{d.assetProfileId.slice(0, 8)}</span>
          {d.inspectionId && <Link href={`/fleet/inspections/${d.inspectionId}`} className="text-xs text-blue-600 hover:underline">{t('insp.openInspection')}</Link>}
          <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString('en-GB')}</span>
        </div>
      ),
    }),
    col.display({ id: 'description', header: () => t('common.description'), cell: ({ row: { original: d } }) => <span className="text-sm whitespace-normal">{d.description}</span> }),
    col.display({ id: 'severity', header: t('insp.severityLabel'), cell: ({ row: { original: d } }) => <SeverityBadge severity={d.severity} /> }),
    col.display({ id: 'status', header: () => t('common.status'), cell: ({ row: { original: d } }) => <DefectStatus d={d} /> }),
    col.display({ id: 'actions', header: '', cell: ({ row: { original: d } }) => <DefectActions d={d} /> }),
  ]
  return (
    <ListPage
      title={t('nav.defects')}
      subtitle={`${rows.length} defect${rows.length !== 1 ? 's' : ''} found`}
      filters={
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
          <select value={status} onChange={(e) => router.push(`/fleet/defects?status=${e.target.value}`)} className={selectClass}>
            <option value="ALL">{t('common.all')}</option>
            {DEFECT_STATUSES.map((s) => <option key={s} value={s}>{t(`insp.defectStatus.${s}`)}</option>)}
          </select>
        </div>
      }
    >
      {list.isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        : list.error ? <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
        : <DataTable data={rows} columns={columns} pageSize={20} />}
    </ListPage>
  )
}
