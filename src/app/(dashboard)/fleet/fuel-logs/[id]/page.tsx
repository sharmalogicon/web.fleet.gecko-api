import { FuelLogView } from '@/components/fuel-logs/FuelLogViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Fuel Log | Fleet' : 'Fuel Log | Fleet' }
}

export default async function FuelLogDetailPage({ params }: PageProps) {
  const { id } = await params
  return <FuelLogView id={id} />
}
