import { Suspense } from 'react'
import { getWorkRequests } from '@/lib/data/work-requests'
import { WorkRequestListClient } from '@/components/work-requests/WorkRequestListClient'
import { WorkRequestFilters } from '@/components/work-requests/WorkRequestFilters'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Work Requests | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WorkRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const workRequests = await getWorkRequests({
    documentNo: params.documentNo,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.workRequests')}
      subtitle={`${workRequests.length} work request${workRequests.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/work-requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.workRequests')}
        </Link>
      }
      filters={
        <WorkRequestFilters
          documentNo={params.documentNo ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <WorkRequestListClient initialData={workRequests} />
      </Suspense>
    </ListPage>
  )
}
