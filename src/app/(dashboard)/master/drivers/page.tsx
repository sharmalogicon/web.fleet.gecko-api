import { Suspense } from 'react'
import { getDrivers } from '@/lib/data/drivers'
import { DriversListClient } from '@/components/drivers/DriversListClient'
import { DriverFilters } from '@/components/drivers/DriverFilters'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'
import { getT } from '@/i18n/server'

interface PageProps {
  searchParams: Promise<{ name?: string; status?: string }>
}

export const metadata = { title: 'Drivers | Fleet' }

export default async function DriversPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const drivers = await getDrivers({
    driverName: params.name,
    status: params.status,
  })

  return (
    <ListPage
      title={t('nav.drivers')}
      subtitle={`${drivers.length} driver${drivers.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/master/drivers/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.drivers')}
        </Link>
      }
      filters={
        <DriverFilters
          name={params.name ?? ''}
          status={params.status ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <DriversListClient initialData={drivers} />
      </Suspense>
    </ListPage>
  )
}
