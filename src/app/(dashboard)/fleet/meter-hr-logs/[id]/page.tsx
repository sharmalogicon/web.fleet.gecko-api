import { notFound } from 'next/navigation'
import { getMeterHrLog } from '@/lib/data/meter-hr-logs'
import { MeterHrLogFormClient } from '@/components/meter-hr-logs/MeterHrLogFormClient'
import { NEW_METER_HR_LOG_DEFAULTS } from '@/types/meter-hr-log'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Meter Hour Log | Fleet' }
  const meterHrLog = await getMeterHrLog(parseInt(id, 10))
  return {
    title: meterHrLog
      ? `${meterHrLog.sequenceNo || meterHrLog.equipmentCode} | Fleet`
      : 'Meter Hour Log | Fleet',
  }
}

export default async function MeterHrLogDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <MeterHrLogFormClient
        meterHrLog={NEW_METER_HR_LOG_DEFAULTS}
        meterHrLogID="new"
        isNew={true}
      />
    )
  }

  const meterHrLogID = parseInt(id, 10)
  if (isNaN(meterHrLogID)) notFound()

  const meterHrLog = await getMeterHrLog(meterHrLogID)
  if (!meterHrLog) notFound()

  return <MeterHrLogFormClient meterHrLog={meterHrLog} meterHrLogID={id} isNew={false} />
}
