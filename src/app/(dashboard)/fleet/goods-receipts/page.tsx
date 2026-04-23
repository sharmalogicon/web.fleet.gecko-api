import { Suspense } from 'react'
import Link from 'next/link'
import { getGoodsReceipts } from '@/lib/data/goods-receipts'
import { GoodsReceiptListClient } from '@/components/goods-receipts/GoodsReceiptListClient'
import { GoodsReceiptFilters } from '@/components/goods-receipts/GoodsReceiptFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Goods Receipts | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    vendorName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function GoodsReceiptsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const receipts = await getGoodsReceipts({
    documentNo: params.documentNo,
    vendorName: params.vendorName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.goodsReceipts')}
      subtitle={`${receipts.length} receipt${receipts.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/goods-receipts/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.goodsReceipts')}
        </Link>
      }
      filters={
        <GoodsReceiptFilters
          documentNo={params.documentNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <GoodsReceiptListClient initialData={receipts} />
      </Suspense>
    </ListPage>
  )
}
