import { notFound } from 'next/navigation'
import { getFuelLog } from '@/lib/data/fuel-logs'
import { FuelLogFormClient } from '@/components/fuel-logs/FuelLogFormClient'
import { NEW_FUEL_LOG_DEFAULTS } from '@/types/fuel-log'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Fuel Log | Fleet' }
  const fuelLog = await getFuelLog(parseInt(id, 10))
  return {
    title: fuelLog
      ? `${fuelLog.voucherNo || `FL-${fuelLog.fuelLogID}`} | Fleet`
      : 'Fuel Log | Fleet',
  }
}

export default async function FuelLogDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return <FuelLogFormClient fuelLog={NEW_FUEL_LOG_DEFAULTS} fuelLogID="new" isNew={true} />
  }

  const fuelLogID = parseInt(id, 10)
  if (isNaN(fuelLogID)) notFound()

  const fuelLog = await getFuelLog(fuelLogID)
  if (!fuelLog) notFound()

  return <FuelLogFormClient fuelLog={fuelLog} fuelLogID={id} isNew={false} />
}
