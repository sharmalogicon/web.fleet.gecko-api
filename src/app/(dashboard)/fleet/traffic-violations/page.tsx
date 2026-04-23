import { Suspense } from 'react'
import Link from 'next/link'
import { getTrafficViolations } from '@/lib/data/traffic-violations'
import { ViolationListClient } from '@/components/traffic-violations/ViolationListClient'
import { ViolationFilters } from '@/components/traffic-violations/ViolationFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Traffic Violations | Fleet' }

interface PageProps {
  searchParams: Promise<{
    ticketNo?: string
    equipmentCode?: string
    violationType?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TrafficViolationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const violations = await getTrafficViolations({
    ticketNo: params.ticketNo,
    equipmentCode: params.equipmentCode,
    violationType: params.violationType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.trafficViolations')}
      subtitle={`${violations.length} record${violations.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/traffic-violations/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.trafficViolations')}
        </Link>
      }
      filters={
        <ViolationFilters
          ticketNo={params.ticketNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          violationType={params.violationType ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <ViolationListClient initialData={violations} />
      </Suspense>
    </ListPage>
  )
}
