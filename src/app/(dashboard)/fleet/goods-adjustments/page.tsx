import { Suspense } from 'react'
import Link from 'next/link'
import { getGoodsAdjustments } from '@/lib/data/goods-adjustments'
import { AdjustmentListClient } from '@/components/goods-adjustments/AdjustmentListClient'
import { AdjustmentFilters } from '@/components/goods-adjustments/AdjustmentFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Goods Adjustments | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    adjustmentType?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function GoodsAdjustmentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const adjustments = await getGoodsAdjustments({
    documentNo: params.documentNo,
    adjustmentType: params.adjustmentType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.goodsAdjustments')}
      subtitle={`${adjustments.length} adjustment${adjustments.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/goods-adjustments/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.goodsAdjustments')}
        </Link>
      }
      filters={
        <AdjustmentFilters
          documentNo={params.documentNo ?? ''}
          adjustmentType={params.adjustmentType ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <AdjustmentListClient initialData={adjustments} />
      </Suspense>
    </ListPage>
  )
}
