import { Suspense } from 'react'
import Link from 'next/link'
import { getTransporters } from '@/lib/data/transporters'
import { TransporterListClient } from '@/components/transporters/TransporterListClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Transporters | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function TransportersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const transporters = await getTransporters(params.search)

  return (
    <ListPage
      title={t('nav.transporters')}
      subtitle={`${transporters.length} transporter${transporters.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/master/transporters/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.transporters')}
        </Link>
      }
    >
      <Suspense fallback={null}>
        <TransporterListClient initialData={transporters} />
      </Suspense>
    </ListPage>
  )
}
