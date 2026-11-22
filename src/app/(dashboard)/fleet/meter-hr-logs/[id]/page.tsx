import { MeterHrLogView } from '@/components/meter-hr-logs/MeterHrLogsView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Meter Hour Log | Fleet' : 'Meter Hour Log | Fleet' }
}

/** "new" records a reading; a reading id opens it read-only. */
export default async function MeterHrLogPage({ params }: PageProps) {
  const { id } = await params
  return <MeterHrLogView id={id} />
}
