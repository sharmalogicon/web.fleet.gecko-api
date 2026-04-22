import { notFound } from 'next/navigation'
import { getWorkRequest } from '@/lib/data/work-requests'
import { WorkRequestFormClient } from '@/components/work-requests/WorkRequestFormClient'
import { NEW_WR_DEFAULTS } from '@/types/work-request'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Work Request | Fleet' }
  const wr = await getWorkRequest(parseInt(id, 10))
  return { title: wr ? `${wr.documentNo} | Fleet` : 'Work Request | Fleet' }
}

export default async function WorkRequestDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <WorkRequestFormClient record={NEW_WR_DEFAULTS} recordID="new" isNew={true} />
  }

  const wrID = parseInt(id, 10)
  if (isNaN(wrID)) notFound()

  const wr = await getWorkRequest(wrID)
  if (!wr) notFound()

  return <WorkRequestFormClient record={wr} recordID={id} isNew={false} />
}
