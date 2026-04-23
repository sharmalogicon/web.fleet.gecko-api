import { Suspense } from 'react'
import { getStockList } from '@/lib/data/stock'
import { StockListClient } from '@/components/stock/StockListClient'
import { StockFilters } from '@/components/stock/StockFilters'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Stock | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; category?: string }>
}

export default async function StockPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const stock = await getStockList({
    search: params.search,
    status: params.status,
    category: params.category,
  })
  return (
    <ListPage
      title={t('nav.stock')}
      subtitle={`${stock.length} item${stock.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/master/stock/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.stock')}
        </Link>
      }
      filters={
        <StockFilters
          search={params.search ?? ''}
          status={params.status ?? 'ALL'}
          category={params.category ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <StockListClient initialData={stock} />
      </Suspense>
    </ListPage>
  )
}
