import { InquiryView } from '@/components/inquiry/InquiryView'
import { WIPInquiryFilters } from '@/components/inquiry/WIPInquiryFilters'

export const metadata = { title: 'WIP Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ workOrderNo?: string; equipmentCode?: string; customerName?: string; dateFrom?: string; dateTo?: string }>
}

/** `GET /api/fleet/inquiry/wip`: WO no (else customer) → search; rows open > 7 days in orange. */
export default async function WIPInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <InquiryView
      code="wip"
      titleKey="nav.inquiryWIP"
      values={{ search: p.workOrderNo || p.customerName, equipmentCode: p.equipmentCode, dateFrom: p.dateFrom, dateTo: p.dateTo }}
      filters={<WIPInquiryFilters workOrderNo={p.workOrderNo ?? ''} equipmentCode={p.equipmentCode ?? ''} customerName={p.customerName ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />}
    />
  )
}
