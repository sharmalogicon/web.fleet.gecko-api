import { MeterLogView } from '@/components/meter-logs/MeterLogsView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Meter Log | Fleet' : 'Meter Log | Fleet' }
}

/** "new" records a reading; a reading id opens it read-only. */
export default async function MeterLogPage({ params }: PageProps) {
  const { id } = await params
  return <MeterLogView id={id} />
}
