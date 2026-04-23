import { notFound } from 'next/navigation'
import { getPurchaseOrder } from '@/lib/data/purchase-orders'
import { POFormClient } from '@/components/purchase-orders/POFormClient'
import { NEW_PO_DEFAULTS } from '@/types/purchase-order'
import type { PurchaseOrder } from '@/types/purchase-order'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Purchase Order | Fleet' }
  const record = await getPurchaseOrder(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Purchase Order | Fleet',
  }
}

const NEW_RECORD: PurchaseOrder = {
  ...NEW_PO_DEFAULTS,
  purchaseOrderID: 0,
  isApproved: false,
  isCancel: false,
  lines: [],
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <POFormClient
        purchaseOrder={NEW_RECORD}
        purchaseOrderID="new"
        isNew={true}
      />
    )
  }

  const purchaseOrderID = parseInt(id, 10)
  if (isNaN(purchaseOrderID)) notFound()

  const record = await getPurchaseOrder(purchaseOrderID)
  if (!record) notFound()

  return (
    <POFormClient
      purchaseOrder={record}
      purchaseOrderID={id}
      isNew={false}
    />
  )
}
