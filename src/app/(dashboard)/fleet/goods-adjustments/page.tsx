import { AdjustmentsListView } from '@/components/goods-adjustments/AdjustmentViews'

export const metadata = { title: 'Goods Adjustments | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; adjustmentType?: string; dateFrom?: string; dateTo?: string }>
}

/** Stock adjustments + transfers merged (prompt 11 §F/G). */
export default async function GoodsAdjustmentsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <AdjustmentsListView documentNo={p.documentNo ?? ''} adjustmentType={p.adjustmentType ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
