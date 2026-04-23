import { Suspense } from 'react'
import Link from 'next/link'
import { getTireProfiles } from '@/lib/data/tire-profiles'
import { TireProfileListClient } from '@/components/tire-profiles/TireProfileListClient'
import { TireProfileFilters } from '@/components/tire-profiles/TireProfileFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Tire Profiles | Fleet' }

interface PageProps {
  searchParams: Promise<{
    serialNo?: string
    brand?: string
    tyreStatus?: string
    isActive?: string
  }>
}

export default async function TireProfilesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const tireProfiles = await getTireProfiles({
    serialNo: params.serialNo,
    brand: params.brand,
    tyreStatus: params.tyreStatus,
    isActive: params.isActive,
  })

  return (
    <ListPage
      title={t('nav.tireProfiles')}
      subtitle={`${tireProfiles.length} tire profile${tireProfiles.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/tires/profiles/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.tireProfiles')}
        </Link>
      }
      filters={
        <TireProfileFilters
          serialNo={params.serialNo ?? ''}
          brand={params.brand ?? ''}
          tyreStatus={params.tyreStatus ?? 'ALL'}
          isActive={params.isActive ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <TireProfileListClient initialData={tireProfiles} />
      </Suspense>
    </ListPage>
  )
}
