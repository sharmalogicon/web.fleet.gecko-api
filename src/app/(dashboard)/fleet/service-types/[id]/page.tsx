import { notFound } from 'next/navigation'
import { getServiceType } from '@/lib/data/service-types'
import { ServiceTypeFormClient } from '@/components/service-types/ServiceTypeFormClient'
import { NEW_SERVICE_TYPE_DEFAULTS } from '@/types/service-type'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Service Type | Fleet' }
  const serviceType = await getServiceType(parseInt(id, 10))
  return { title: serviceType ? `${serviceType.code} | Fleet` : 'Service Type | Fleet' }
}

export default async function ServiceTypeDetailPage({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') {
    return <ServiceTypeFormClient record={NEW_SERVICE_TYPE_DEFAULTS} recordID="new" isNew={true} />
  }
  const serviceTypeID = parseInt(id, 10)
  if (isNaN(serviceTypeID)) notFound()
  const serviceType = await getServiceType(serviceTypeID)
  if (!serviceType) notFound()
  return <ServiceTypeFormClient record={serviceType} recordID={id} isNew={false} />
}
