import { ViolationView } from '@/components/traffic-violations/ViolationViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Traffic Violation | Fleet' : 'Traffic Violation | Fleet' }
}

export default async function TrafficViolationDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ViolationView id={id} />
}
