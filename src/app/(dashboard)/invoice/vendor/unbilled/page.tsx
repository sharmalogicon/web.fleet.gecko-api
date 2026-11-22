import { UnbilledListView } from '@/components/vendor-invoices/VendorInvoiceViews'

export const metadata = { title: 'Unbilled Vendor Invoices | Fleet' }

interface PageProps {
  searchParams: Promise<{ vendorName?: string; poNo?: string; grNo?: string; dateFrom?: string; dateTo?: string }>
}

/** Billable GRN lines, sublets and tyre events not yet invoiced (prompt 15 §A). */
export default async function UnbilledInvoicesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <UnbilledListView vendorName={p.vendorName ?? ''} poNo={p.poNo ?? ''} grNo={p.grNo ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
