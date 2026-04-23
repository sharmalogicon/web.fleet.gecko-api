import { notFound } from 'next/navigation'
import { getGoodsRequest } from '@/lib/data/goods-requests'
import { GoodsRequestFormClient } from '@/components/goods-requests/GoodsRequestFormClient'
import { NEW_GOODS_REQUEST_DEFAULTS } from '@/types/goods-request'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Goods Request | Fleet' }
  const record = await getGoodsRequest(parseInt(id, 10))
  return {
    title: record ? `${record.reqNo} | Fleet` : 'Goods Request | Fleet',
  }
}

export default async function GoodsRequestDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <GoodsRequestFormClient
        goodsRequest={NEW_GOODS_REQUEST_DEFAULTS}
        goodsRequestID="new"
        isNew={true}
      />
    )
  }

  const goodsRequestID = parseInt(id, 10)
  if (isNaN(goodsRequestID)) notFound()

  const record = await getGoodsRequest(goodsRequestID)
  if (!record) notFound()

  return <GoodsRequestFormClient goodsRequest={record} goodsRequestID={id} isNew={false} />
}
