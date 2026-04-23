import { notFound } from 'next/navigation'
import { getGoodsReceipt } from '@/lib/data/goods-receipts'
import { GoodsReceiptFormClient } from '@/components/goods-receipts/GoodsReceiptFormClient'
import { NEW_GOODS_RECEIPT_DEFAULTS } from '@/types/goods-receipt'
import type { GoodsReceipt } from '@/types/goods-receipt'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Goods Receipt | Fleet' }
  const record = await getGoodsReceipt(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Goods Receipt | Fleet',
  }
}

const NEW_RECORD: GoodsReceipt = {
  ...NEW_GOODS_RECEIPT_DEFAULTS,
  goodsReceiptID: 0,
  isCancel: false,
  lines: [],
}

export default async function GoodsReceiptDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <GoodsReceiptFormClient
        goodsReceipt={NEW_RECORD}
        goodsReceiptID="new"
        isNew={true}
      />
    )
  }

  const goodsReceiptID = parseInt(id, 10)
  if (isNaN(goodsReceiptID)) notFound()

  const record = await getGoodsReceipt(goodsReceiptID)
  if (!record) notFound()

  return (
    <GoodsReceiptFormClient
      goodsReceipt={record}
      goodsReceiptID={id}
      isNew={false}
    />
  )
}
