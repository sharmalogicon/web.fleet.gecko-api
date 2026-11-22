'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { useT } from '@/i18n/I18nContext'
import { NEW_WR_FORM, toFormValues, useWorkRequest, useWorkRequests } from '@/lib/api/fleet/workRequests'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { WorkRequestFilters } from './WorkRequestFilters'
import { WorkRequestListClient } from './WorkRequestListClient'
import { WorkRequestFormClient } from './WorkRequestFormClient'

const spinner = <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>

interface ListProps {
  documentNo: string
  status: string
  dateFrom: string
  dateTo: string
}

export function WorkRequestsListView({ documentNo, status, dateFrom, dateTo }: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useWorkRequests({ search: documentNo || undefined, status, from: dateFrom || undefined, to: dateTo || undefined })
  const rows = list.data ?? []
  return (
    <ListPage
      title={t('nav.workRequests')}
      subtitle={`${rows.length} work request${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.workrequest.create') && (
          <Link href="/fleet/work-requests/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + {t('nav.workRequests')}
          </Link>
        )
      }
      filters={<WorkRequestFilters documentNo={documentNo} status={status} dateFrom={dateFrom} dateTo={dateTo} />}
    >
      {list.isLoading ? spinner : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <WorkRequestListClient data={rows} />
      )}
    </ListPage>
  )
}

export function WorkRequestView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const wr = useWorkRequest(isNew ? null : id)
  if (isNew) return <WorkRequestFormClient record={NEW_WR_FORM} isNew />
  if (wr.isLoading) return spinner
  if (wr.error instanceof ApiError && (wr.error.status === 404 || wr.error.status === 400)) notFound()
  if (wr.error || !wr.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(wr.error, t)}</div>
  }
  return <WorkRequestFormClient key={wr.data.rowVersion} record={toFormValues(wr.data)} current={wr.data} isNew={false} />
}
