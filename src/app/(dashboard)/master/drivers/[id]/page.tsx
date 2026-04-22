import { notFound } from 'next/navigation'
import { getDriver } from '@/lib/data/drivers'
import { DriverProfileClient } from '@/components/drivers/DriverProfileClient'
import { NEW_DRIVER_DEFAULTS } from '@/types/driver'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Driver | Fleet' }
  const driver = await getDriver(parseInt(id, 10))
  return { title: driver ? `${driver.driverName} | Fleet` : 'Driver | Fleet' }
}

export default async function DriverProfilePage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <DriverProfileClient
        driver={NEW_DRIVER_DEFAULTS}
        driverID="new"
        isNew={true}
      />
    )
  }

  const driverID = parseInt(id, 10)
  if (isNaN(driverID)) notFound()

  const driver = await getDriver(driverID)
  if (!driver) notFound()

  return (
    <DriverProfileClient
      driver={driver}
      driverID={id}
      isNew={false}
    />
  )
}
