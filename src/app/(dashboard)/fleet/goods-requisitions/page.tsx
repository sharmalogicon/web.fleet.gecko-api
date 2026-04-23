import { Suspense } from 'react'
import Link from 'next/link'
import { getGoodsRequisitions } from '@/lib/data/goods-requisitions'
import { GoodsRequisitionListClient } from '@/components/goods-requisitions/GoodsRequisitionListClient'
import { GoodsRequisitionFilters } from '@/components/goods-requisitions/GoodsRequisitionFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Goods Requisitions | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    status?: string
  }>
}

export default async function GoodsRequisitionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const goodsRequisitions = await getGoodsRequisitions({
    documentNo: params.documentNo,
    status: params.status,
  })

  return (
    <ListPage
      title={t('nav.goodsRequisitions')}
      subtitle={`${goodsRequisitions.length} goods requisition${goodsRequisitions.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/goods-requisitions/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.goodsRequisitions')}
        </Link>
      }
      filters={
        <GoodsRequisitionFilters
          documentNo={params.documentNo ?? ''}
          status={params.status ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <GoodsRequisitionListClient initialData={goodsRequisitions} />
      </Suspense>
    </ListPage>
  )
}
