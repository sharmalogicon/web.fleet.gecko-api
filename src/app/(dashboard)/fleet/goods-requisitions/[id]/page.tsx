import { GoodsRequestView } from '@/components/goods-requests/GoodsRequestViews'

export const metadata = { title: 'Goods Requisitions | Fleet' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GoodsRequestView base="/fleet/goods-requisitions" id={id} />
}
