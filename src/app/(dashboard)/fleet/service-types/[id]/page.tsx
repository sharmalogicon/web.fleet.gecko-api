import { ServiceTypeProfileView } from '@/components/service-types/ServiceTypeProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Service Type | Fleet' : 'Service Type | Fleet' }
}

export default async function ServiceTypeDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ServiceTypeProfileView id={id} />
}
