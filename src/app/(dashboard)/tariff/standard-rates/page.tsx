import { Suspense } from 'react'
import Link from 'next/link'
import { getStandardRates } from '@/lib/data/standard-rates'
import { StandardRateListClient } from '@/components/standard-rates/StandardRateListClient'
import { StandardRateFilters } from '@/components/standard-rates/StandardRateFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Standard Rates | Tariff' }

interface PageProps {
  searchParams: Promise<{
    rateCode?: string
    description?: string
    status?: string
  }>
}

export default async function StandardRatesPage({ searchParams }: PageProps) {
  const params = await searchParams

  const isApproved =
    params.status === 'approved' ? true : params.status === 'draft' ? false : 'all'

  const rates = await getStandardRates({
    rateCode: params.rateCode,
    description: params.description,
    isApproved,
  })

  return (
    <ListPage
      title="Standard Rates"
      subtitle={`${rates.length} record${rates.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/tariff/standard-rates/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Standard Rate
        </Link>
      }
      filters={
        <StandardRateFilters
          rateCode={params.rateCode ?? ''}
          description={params.description ?? ''}
          status={params.status ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <StandardRateListClient initialData={rates} />
      </Suspense>
    </ListPage>
  )
}
