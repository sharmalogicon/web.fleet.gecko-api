import { notFound } from 'next/navigation'
import { getDriver } from '@/lib/data/drivers'
import { DriverImagesClient } from '@/components/drivers/DriverImagesClient'

export default async function DriverImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const driverID = parseInt(id, 10)
  if (isNaN(driverID)) notFound()
  const driver = await getDriver(driverID)
  if (!driver) notFound()
  return <DriverImagesClient driver={driver} />
}
