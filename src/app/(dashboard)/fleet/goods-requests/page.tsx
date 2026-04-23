import { Suspense } from 'react'
import Link from 'next/link'
import { getGoodsRequests } from '@/lib/data/goods-requests'
import { GoodsRequestListClient } from '@/components/goods-requests/GoodsRequestListClient'
import { GoodsRequestFilters } from '@/components/goods-requests/GoodsRequestFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Goods Requests | Fleet' }

interface PageProps {
  searchParams: Promise<{
    reqNo?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function GoodsRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const goodsRequests = await getGoodsRequests({
    reqNo: params.reqNo,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.goodsRequests')}
      subtitle={`${goodsRequests.length} goods request${goodsRequests.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/goods-requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.goodsRequests')}
        </Link>
      }
      filters={
        <GoodsRequestFilters
          reqNo={params.reqNo ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <GoodsRequestListClient initialData={goodsRequests} />
      </Suspense>
    </ListPage>
  )
}
