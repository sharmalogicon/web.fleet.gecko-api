import { GoodsReceiptsListView } from '@/components/goods-receipts/GoodsReceiptViews'

export const metadata = { title: 'Goods Receipts | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; vendorName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** On `/api/fleet/goods-receipts` (prompt 11 §D). */
export default async function GoodsReceiptsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <GoodsReceiptsListView
      documentNo={p.documentNo ?? ''}
      vendorName={p.vendorName ?? ''}
      status={p.status ?? 'ALL'}
      dateFrom={p.dateFrom ?? ''}
      dateTo={p.dateTo ?? ''}
    />
  )
}
