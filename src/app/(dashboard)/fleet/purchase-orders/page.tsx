import { PurchaseOrdersListView } from '@/components/purchase-orders/PurchaseOrderViews'

export const metadata = { title: 'Purchase Orders | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; vendorName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** On `/api/fleet/purchase-orders` (prompt 11 §C). */
export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <PurchaseOrdersListView
      documentNo={p.documentNo ?? ''}
      vendorName={p.vendorName ?? ''}
      status={p.status ?? 'ALL'}
      dateFrom={p.dateFrom ?? ''}
      dateTo={p.dateTo ?? ''}
    />
  )
}
