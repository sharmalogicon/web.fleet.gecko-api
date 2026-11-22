import { VendorPaymentsListView } from '@/components/vendor-payments/VendorPaymentViews'

export const metadata = { title: 'Vendor Payments | Fleet' }

interface PageProps {
  searchParams: Promise<{ receiptNo?: string; vendorName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Payments recorded on vendor invoices (prompt 15 §D) + approval (prompt 19 §A). */
export default async function VendorPaymentsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <VendorPaymentsListView receiptNo={p.receiptNo ?? ''} vendorName={p.vendorName ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
