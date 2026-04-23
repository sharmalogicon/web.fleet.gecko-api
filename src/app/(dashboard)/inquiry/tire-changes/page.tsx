import { getTireChangeInquiry } from '@/lib/data/inquiry/tire-changes'
import { TireChangeInquiryFilters } from '@/components/inquiry/TireChangeInquiryFilters'
import { TireChangeInquiryClient } from '@/components/inquiry/TireChangeInquiryClient'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Tire Change Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    equipmentCode?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TireChangeInquiryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const data = await getTireChangeInquiry({
    documentNo: params.documentNo,
    equipmentCode: params.equipmentCode,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.inquiryTireChanges')}
      subtitle={`${data.length} record${data.length !== 1 ? 's' : ''} found`}
      filters={
        <TireChangeInquiryFilters
          documentNo={params.documentNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <TireChangeInquiryClient data={data} />
    </ListPage>
  )
}
