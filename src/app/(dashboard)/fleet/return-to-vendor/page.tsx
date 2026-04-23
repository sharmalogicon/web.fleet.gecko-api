import { Suspense } from 'react'
import Link from 'next/link'
import { getReturns } from '@/lib/data/return-to-vendor'
import { ReturnListClient } from '@/components/return-to-vendor/ReturnListClient'
import { ReturnFilters } from '@/components/return-to-vendor/ReturnFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Return to Vendor | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    vendorName?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function ReturnToVendorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const returns = await getReturns({
    documentNo: params.documentNo,
    vendorName: params.vendorName,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.returnToVendor')}
      subtitle={`${returns.length} return${returns.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/return-to-vendor/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.returnToVendor')}
        </Link>
      }
      filters={
        <ReturnFilters
          documentNo={params.documentNo ?? ''}
          vendorName={params.vendorName ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <ReturnListClient initialData={returns} />
      </Suspense>
    </ListPage>
  )
}
