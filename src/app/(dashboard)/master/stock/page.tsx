import { StockListView } from '@/components/stock/StockListView'

export const metadata = { title: 'Stock Profiles | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; category?: string }>
}

/** Fleet items, read in the browser. */
export default async function StockPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <StockListView search={params.search ?? ''} status={params.status ?? 'ALL'} category={params.category ?? 'ALL'} />
}
