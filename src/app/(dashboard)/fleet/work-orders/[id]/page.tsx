import { notFound } from 'next/navigation'
import { getWorkOrder } from '@/lib/data/work-orders'
import { WorkOrderFormClient } from '@/components/work-orders/WorkOrderFormClient'
import { NEW_WO_DEFAULTS } from '@/types/work-order'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Work Order | Fleet' }
  const wo = await getWorkOrder(parseInt(id, 10))
  return { title: wo ? `${wo.documentNo} | Fleet` : 'Work Order | Fleet' }
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <WorkOrderFormClient workOrder={NEW_WO_DEFAULTS} woID="new" isNew={true} />
  }

  const woID = parseInt(id, 10)
  if (isNaN(woID)) notFound()

  const wo = await getWorkOrder(woID)
  if (!wo) notFound()

  return <WorkOrderFormClient workOrder={wo} woID={id} isNew={false} />
}
