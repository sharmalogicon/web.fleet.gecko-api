import { StockCountsListView } from '@/components/stock-counts/StockCountViews'

export const metadata = { title: 'Stock Counts | Fleet' }

/** New page (prompt 11 §H) on `/api/fleet/stock-counts`. */
export default async function StockCountsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const p = await searchParams
  return <StockCountsListView search={p.search ?? ''} status={p.status ?? 'ALL'} />
}
