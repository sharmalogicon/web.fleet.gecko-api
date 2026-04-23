import { Suspense } from 'react'
import Link from 'next/link'
import { getAccidentReports } from '@/lib/data/accident-reports'
import { AccidentListClient } from '@/components/accidents/AccidentListClient'
import { AccidentFilters } from '@/components/accidents/AccidentFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Accident Reports | Fleet' }

interface PageProps {
  searchParams: Promise<{
    equipmentCode?: string
    driverName?: string
    accidentType?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function AccidentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const accidents = await getAccidentReports({
    equipmentCode: params.equipmentCode,
    driverName: params.driverName,
    accidentType: params.accidentType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.accidents')}
      subtitle={`${accidents.length} record${accidents.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/accidents/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.accidents')}
        </Link>
      }
      filters={
        <AccidentFilters
          equipmentCode={params.equipmentCode ?? ''}
          driverName={params.driverName ?? ''}
          accidentType={params.accidentType ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <AccidentListClient initialData={accidents} />
      </Suspense>
    </ListPage>
  )
}
