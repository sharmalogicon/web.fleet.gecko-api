import { InquiryView } from '@/components/inquiry/InquiryView'
import { POInquiryFilters } from '@/components/inquiry/POInquiryFilters'

export const metadata = { title: 'Purchase Order Inquiry | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; vendorName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** `GET /api/fleet/inquiry/purchase-orders`: doc no → poNo, vendor → supplier. */
export default async function POInquiryPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <InquiryView
      code="purchase-orders"
      titleKey="nav.inquiryPurchaseOrders"
      values={{ poNo: p.documentNo, vendorName: p.vendorName, status: p.status, dateFrom: p.dateFrom, dateTo: p.dateTo }}
      filters={<POInquiryFilters documentNo={p.documentNo ?? ''} vendorName={p.vendorName ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />}
    />
  )
}
