import { Suspense } from 'react'
import { getServiceTypes } from '@/lib/data/service-types'
import { ServiceTypeListClient } from '@/components/service-types/ServiceTypeListClient'
import { ServiceTypeFilters } from '@/components/service-types/ServiceTypeFilters'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Service Types | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string }>
}

export default async function ServiceTypesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const serviceTypes = await getServiceTypes({
    search: params.search,
    category: params.category,
  })
  return (
    <ListPage
      title={t('nav.serviceTypes')}
      subtitle={`${serviceTypes.length} service type${serviceTypes.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/service-types/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.serviceTypes')}
        </Link>
      }
      filters={
        <ServiceTypeFilters
          search={params.search ?? ''}
          category={params.category ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <ServiceTypeListClient initialData={serviceTypes} />
      </Suspense>
    </ListPage>
  )
}
