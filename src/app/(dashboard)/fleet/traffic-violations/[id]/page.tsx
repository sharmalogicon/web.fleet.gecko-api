import { notFound } from 'next/navigation'
import { getTrafficViolation } from '@/lib/data/traffic-violations'
import { ViolationFormClient } from '@/components/traffic-violations/ViolationFormClient'
import { NEW_VIOLATION_DEFAULTS } from '@/types/traffic-violation'
import type { TrafficViolation } from '@/types/traffic-violation'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Traffic Violation | Fleet' }
  const record = await getTrafficViolation(parseInt(id, 10))
  return {
    title: record ? `${record.ticketNo} | Fleet` : 'Traffic Violation | Fleet',
  }
}

const NEW_RECORD: TrafficViolation = {
  ...NEW_VIOLATION_DEFAULTS,
  violationID: 0,
}

export default async function TrafficViolationDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <ViolationFormClient
        violation={NEW_RECORD}
        violationID="new"
        isNew={true}
      />
    )
  }

  const violationID = parseInt(id, 10)
  if (isNaN(violationID)) notFound()

  const record = await getTrafficViolation(violationID)
  if (!record) notFound()

  return (
    <ViolationFormClient
      violation={record}
      violationID={id}
      isNew={false}
    />
  )
}
