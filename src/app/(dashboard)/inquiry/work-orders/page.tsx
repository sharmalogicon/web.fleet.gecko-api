import { InquiryView } from '@/components/inquiry/InquiryView'
import { WOInquiryFilters } from '@/components/inquiry/WOInquiryFilters'

export const metadata = { title: 'Work Order Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ workOrderNo?: string; equipmentCode?: string; woType?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** `GET /api/fleet/inquiry/work-orders` (prompt 16 §C): WO no → search, type → woType. */
export default async function WOInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <InquiryView
      code="work-orders"
      titleKey="nav.inquiryWorkOrders"
      values={{ search: p.workOrderNo, equipmentCode: p.equipmentCode, woType: p.woType, status: p.status, dateFrom: p.dateFrom, dateTo: p.dateTo }}
      filters={<WOInquiryFilters workOrderNo={p.workOrderNo ?? ''} equipmentCode={p.equipmentCode ?? ''} woType={p.woType ?? 'ALL'} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />}
    />
  )
}
