import { PMScheduleView } from '@/components/pm-scheduler/PMSchedulerViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New PM Schedule | Fleet' : 'PM Schedule | Fleet' }
}

export default async function PMSchedulePage({ params }: PageProps) {
  const { id } = await params
  return <PMScheduleView id={id} />
}
