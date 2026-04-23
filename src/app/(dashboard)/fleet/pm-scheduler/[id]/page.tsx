import { notFound } from 'next/navigation'
import { getPMSchedule } from '@/lib/data/pm-scheduler'
import { PMScheduleFormClient } from '@/components/pm-scheduler/PMScheduleFormClient'
import { NEW_PM_DEFAULTS } from '@/types/pm-scheduler'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New PM Schedule | Fleet' }
  const pm = await getPMSchedule(parseInt(id, 10))
  return { title: pm ? `${pm.scheduleNo} | Fleet` : 'PM Schedule | Fleet' }
}

export default async function PMScheduleDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <PMScheduleFormClient schedule={NEW_PM_DEFAULTS} pmID="new" isNew={true} />
  }

  const pmID = parseInt(id, 10)
  if (isNaN(pmID)) notFound()

  const pm = await getPMSchedule(pmID)
  if (!pm) notFound()

  return <PMScheduleFormClient schedule={pm} pmID={id} isNew={false} />
}
