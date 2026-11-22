import { StockCountView } from '@/components/stock-counts/StockCountViews'

export const metadata = { title: 'Stock Count | Fleet' }

export default async function StockCountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StockCountView id={id} />
}
