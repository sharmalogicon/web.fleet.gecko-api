import { getTruckMovementInquiry } from '@/lib/data/inquiry/truck-movements'
import { TruckMovementFilters } from '@/components/inquiry/TruckMovementFilters'
import { TruckMovementClient } from '@/components/inquiry/TruckMovementClient'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Truck Movement Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{
    truckNo?: string
    tripType?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TruckMovementInquiryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await getTruckMovementInquiry({
    truckNo: params.truckNo,
    tripType: params.tripType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="Truck Movement Inquiry"
      subtitle={`${data.length} record${data.length !== 1 ? 's' : ''} found`}
      filters={
        <TruckMovementFilters
          truckNo={params.truckNo ?? ''}
          tripType={params.tripType ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <TruckMovementClient data={data} />
    </ListPage>
  )
}
