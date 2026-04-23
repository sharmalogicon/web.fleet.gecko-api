import { Suspense } from 'react'
import { getPendingRecap } from '@/lib/data/pending-recap'
import { PendingRecapClient } from '@/components/tire-profiles/PendingRecapClient'
import { PendingRecapFilters } from '@/components/tire-profiles/PendingRecapFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Pending Tire Recap | Fleet' }

interface PageProps {
  searchParams: Promise<{
    serialNo?: string
    brand?: string
    status?: string
  }>
}

export default async function PendingRecapPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const records = await getPendingRecap({
    serialNo: params.serialNo,
    brand: params.brand,
    status: params.status,
  })

  return (
    <ListPage
      title={t('nav.pendingRecap')}
      subtitle={`${records.length} recap record${records.length !== 1 ? 's' : ''} found`}
      filters={
        <PendingRecapFilters
          serialNo={params.serialNo ?? ''}
          brand={params.brand ?? ''}
          status={params.status ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <PendingRecapClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
