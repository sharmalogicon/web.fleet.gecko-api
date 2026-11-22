import { TyreEventInquiryView } from '@/components/inquiry/TyreEventInquiryView'

export const metadata = { title: 'Tire Change Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; equipmentCode?: string; dateFrom?: string; dateTo?: string }>
}

/** Tyre history on `/api/fleet/tyre-events` (prompt 13 §D). */
export default async function TireChangeInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <TyreEventInquiryView documentNo={p.documentNo ?? ''} equipmentCode={p.equipmentCode ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
