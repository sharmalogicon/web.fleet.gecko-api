import { AdjustmentView } from '@/components/goods-adjustments/AdjustmentViews'

export const metadata = { title: 'Goods Adjustment | Fleet' }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ kind?: string }>
}

/** `?kind=transfer` opens a stock transfer (same screen, TRANSFER type). */
export default async function GoodsAdjustmentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { kind } = await searchParams
  return <AdjustmentView id={id} kind={kind} />
}
