import { getWOInquiry } from '@/lib/data/inquiry/work-orders'
import { WOInquiryFilters } from '@/components/inquiry/WOInquiryFilters'
import { WOInquiryClient } from '@/components/inquiry/WOInquiryClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Work Order Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{
    workOrderNo?: string
    equipmentCode?: string
    woType?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WOInquiryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const data = await getWOInquiry({
    workOrderNo: params.workOrderNo,
    equipmentCode: params.equipmentCode,
    woType: params.woType,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.inquiryWorkOrders')}
      subtitle={`${data.length} record${data.length !== 1 ? 's' : ''} found`}
      filters={
        <WOInquiryFilters
          workOrderNo={params.workOrderNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          woType={params.woType ?? 'ALL'}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <WOInquiryClient data={data} />
    </ListPage>
  )
}
