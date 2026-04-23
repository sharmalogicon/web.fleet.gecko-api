import { Suspense } from 'react'
import Link from 'next/link'
import { getTireChanges } from '@/lib/data/tire-changes'
import { TireChangeListClient } from '@/components/tire-changes/TireChangeListClient'
import { TireChangeFilters } from '@/components/tire-changes/TireChangeFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Tire Changes | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    equipmentCode?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TireChangesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const tireChanges = await getTireChanges({
    documentNo: params.documentNo,
    equipmentCode: params.equipmentCode,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.tireChanges')}
      subtitle={`${tireChanges.length} record${tireChanges.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/tires/changes/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.tireChanges')}
        </Link>
      }
      filters={
        <TireChangeFilters
          documentNo={params.documentNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <TireChangeListClient initialData={tireChanges} />
      </Suspense>
    </ListPage>
  )
}
