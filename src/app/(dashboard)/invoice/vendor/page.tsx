import { VendorInvoicesListView } from '@/components/vendor-invoices/VendorInvoiceViews'

export const metadata = { title: 'Vendor Invoices | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; customerName?: string; vendorInvoiceNo?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Vendor invoices from the Fleet API (prompt 15 §B) + the Export dialog (§E). */
export default async function VendorInvoicesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <VendorInvoicesListView documentNo={p.documentNo ?? ''} customerName={p.customerName ?? ''} vendorInvoiceNo={p.vendorInvoiceNo ?? ''}
      status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
  )
}
