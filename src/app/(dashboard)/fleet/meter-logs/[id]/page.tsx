import { notFound } from 'next/navigation'
import { getMeterLog } from '@/lib/data/meter-logs'
import { MeterLogFormClient } from '@/components/meter-logs/MeterLogFormClient'
import { NEW_METER_LOG_DEFAULTS } from '@/types/meter-log'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Meter Log | Fleet' }
  const meterLog = await getMeterLog(parseInt(id, 10))
  return {
    title: meterLog
      ? `${meterLog.equipmentCode} Meter Log | Fleet`
      : 'Meter Log | Fleet',
  }
}

export default async function MeterLogDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <MeterLogFormClient meterLog={NEW_METER_LOG_DEFAULTS} meterLogID="new" isNew={true} />
  }

  const meterLogID = parseInt(id, 10)
  if (isNaN(meterLogID)) notFound()

  const meterLog = await getMeterLog(meterLogID)
  if (!meterLog) notFound()

  return <MeterLogFormClient meterLog={meterLog} meterLogID={id} isNew={false} />
}
