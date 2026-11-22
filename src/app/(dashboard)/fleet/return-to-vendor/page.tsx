import { ReturnsListView } from '@/components/return-to-vendor/ReturnViews'

export const metadata = { title: 'Return to Vendor | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; vendorName?: string; dateFrom?: string; dateTo?: string }>
}

/** On `/api/fleet/vendor-returns` (prompt 11 §E). */
export default async function ReturnToVendorPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <ReturnsListView documentNo={p.documentNo ?? ''} vendorName={p.vendorName ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
