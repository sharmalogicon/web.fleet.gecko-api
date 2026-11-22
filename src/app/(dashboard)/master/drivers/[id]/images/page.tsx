import { DriverImagesClient } from '@/components/drivers/DriverImagesClient'

export default async function DriverImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DriverImagesClient driverId={id} />
}
