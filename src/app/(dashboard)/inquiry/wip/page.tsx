import { getWIPInquiry } from '@/lib/data/inquiry/wip'
import { WIPInquiryFilters } from '@/components/inquiry/WIPInquiryFilters'
import { WIPInquiryClient } from '@/components/inquiry/WIPInquiryClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'WIP Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{
    workOrderNo?: string
    equipmentCode?: string
    customerName?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WIPInquiryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const data = await getWIPInquiry({
    workOrderNo: params.workOrderNo,
    equipmentCode: params.equipmentCode,
    customerName: params.customerName,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.inquiryWIP')}
      subtitle={`${data.length} work-in-progress record${data.length !== 1 ? 's' : ''} found`}
      filters={
        <WIPInquiryFilters
          workOrderNo={params.workOrderNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          customerName={params.customerName ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <WIPInquiryClient data={data} />
    </ListPage>
  )
}
