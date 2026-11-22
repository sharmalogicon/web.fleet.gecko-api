import { WorkOrderView } from '@/components/work-orders/WorkOrderViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Work Order | Fleet' : 'Work Order | Fleet' }
}

export default async function WorkOrderPage({ params }: PageProps) {
  const { id } = await params
  return <WorkOrderView id={id} />
}
