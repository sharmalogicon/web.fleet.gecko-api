import { notFound } from 'next/navigation'
import { getGoodsAdjustment } from '@/lib/data/goods-adjustments'
import { AdjustmentFormClient } from '@/components/goods-adjustments/AdjustmentFormClient'
import { NEW_GOODS_ADJUSTMENT_DEFAULTS } from '@/types/goods-adjustment'
import type { GoodsAdjustment } from '@/types/goods-adjustment'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Goods Adjustment | Fleet' }
  const record = await getGoodsAdjustment(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Goods Adjustment | Fleet',
  }
}

const NEW_RECORD: GoodsAdjustment = {
  ...NEW_GOODS_ADJUSTMENT_DEFAULTS,
  adjustmentID: 0,
  lines: [],
}

export default async function GoodsAdjustmentDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <AdjustmentFormClient
        goodsAdjustment={NEW_RECORD}
        adjustmentID="new"
        isNew={true}
      />
    )
  }

  const adjustmentID = parseInt(id, 10)
  if (isNaN(adjustmentID)) notFound()

  const record = await getGoodsAdjustment(adjustmentID)
  if (!record) notFound()

  return (
    <AdjustmentFormClient
      goodsAdjustment={record}
      adjustmentID={id}
      isNew={false}
    />
  )
}
