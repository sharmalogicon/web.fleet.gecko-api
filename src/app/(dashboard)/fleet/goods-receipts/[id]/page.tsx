import { GoodsReceiptView } from '@/components/goods-receipts/GoodsReceiptViews'

export const metadata = { title: 'Goods Receipt | Fleet' }

export default async function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GoodsReceiptView id={id} />
}
