import { PurchaseOrderView } from '@/components/purchase-orders/PurchaseOrderViews'

export const metadata = { title: 'Purchase Order | Fleet' }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ goodsRequestId?: string }>
}

/** `new?goodsRequestId=` opens a PO prefilled from the request's open lines (prompt 11 §B). */
export default async function PurchaseOrderDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { goodsRequestId } = await searchParams
  return <PurchaseOrderView id={id} goodsRequestId={goodsRequestId} />
}
