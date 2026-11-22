import { InquiryView } from '@/components/inquiry/InquiryView'
import { TruckMovementFilters } from '@/components/inquiry/TruckMovementFilters'

export const metadata = { title: 'Truck Movement Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ truckNo?: string; tripType?: string; dateFrom?: string; dateTo?: string }>
}

/** `GET /api/fleet/inquiry/truck-movements`: Trucking job-order legs of linked trucks; truck no → equipmentCode. */
export default async function TruckMovementInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <InquiryView
      code="truck-movements"
      titleKey="nav.inquiryTruckMovements"
      values={{ equipmentCode: p.truckNo, tripType: p.tripType, dateFrom: p.dateFrom, dateTo: p.dateTo }}
      filters={<TruckMovementFilters truckNo={p.truckNo ?? ''} tripType={p.tripType ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />}
    />
  )
}
