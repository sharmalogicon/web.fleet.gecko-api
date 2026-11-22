import { InquiryView } from '@/components/inquiry/InquiryView'
import { TireChangeInquiryFilters } from '@/components/inquiry/TireChangeInquiryFilters'

export const metadata = { title: 'Tire Change Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; equipmentCode?: string; dateFrom?: string; dateTo?: string }>
}

/** `GET /api/fleet/inquiry/tyre-changes` (prompt 16 §C): transaction no → search. */
export default async function TireChangeInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <InquiryView
      code="tyre-changes"
      titleKey="nav.inquiryTireChanges"
      values={{ search: p.documentNo, equipmentCode: p.equipmentCode, dateFrom: p.dateFrom, dateTo: p.dateTo }}
      filters={<TireChangeInquiryFilters documentNo={p.documentNo ?? ''} equipmentCode={p.equipmentCode ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />}
    />
  )
}
