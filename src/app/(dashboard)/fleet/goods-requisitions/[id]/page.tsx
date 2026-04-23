import { notFound } from 'next/navigation'
import { getGoodsRequisition } from '@/lib/data/goods-requisitions'
import { GoodsRequisitionFormClient } from '@/components/goods-requisitions/GoodsRequisitionFormClient'
import { NEW_GOODS_REQUISITION_DEFAULTS } from '@/types/goods-requisition'
import type { GoodsRequisition } from '@/types/goods-requisition'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Goods Requisition | Fleet' }
  const record = await getGoodsRequisition(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Goods Requisition | Fleet',
  }
}

const NEW_RECORD: GoodsRequisition = {
  ...NEW_GOODS_REQUISITION_DEFAULTS,
  requisitionID: 0,
  isApproved: false,
  isCancel: false,
  lines: [],
}

export default async function GoodsRequisitionDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <GoodsRequisitionFormClient
        goodsRequisition={NEW_RECORD}
        goodsRequisitionID="new"
        isNew={true}
      />
    )
  }

  const requisitionID = parseInt(id, 10)
  if (isNaN(requisitionID)) notFound()

  const record = await getGoodsRequisition(requisitionID)
  if (!record) notFound()

  return (
    <GoodsRequisitionFormClient
      goodsRequisition={record}
      goodsRequisitionID={id}
      isNew={false}
    />
  )
}
