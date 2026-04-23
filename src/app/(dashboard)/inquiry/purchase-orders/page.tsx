import { getPOInquiry } from '@/lib/data/inquiry/purchase-orders'
import { POInquiryFilters } from '@/components/inquiry/POInquiryFilters'
import { POInquiryClient } from '@/components/inquiry/POInquiryClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Purchase Order Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    vendorName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function POInquiryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const data = await getPOInquiry({
    documentNo: params.documentNo,
    vendorName: params.vendorName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.inquiryPurchaseOrders')}
      subtitle={`${data.length} record${data.length !== 1 ? 's' : ''} found`}
      filters={
        <POInquiryFilters
          documentNo={params.documentNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <POInquiryClient data={data} />
    </ListPage>
  )
}
