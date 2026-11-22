'use client'

import { Loader2 } from 'lucide-react'
import { useDriver } from '@/lib/api/fleet/drivers'
import { ImageGallery } from '@/components/shared/ImageGallery'
import { ListPage } from '@/components/shared/ListPage'

interface DriverImage {
  imageID: number
  filename: string
  url: string
  uploadedAt: string
}

/** Still mock (prompt 05: no image API yet); keyed by the old numeric ids, so API drivers show none. */
function getMockDriverImages(driverID: number): DriverImage[] {
  if (driverID === 1) return [
    { imageID: 1, filename: 'profile_drv001.jpg', url: '/placeholder.jpg', uploadedAt: '2024-03-15' },
    { imageID: 2, filename: 'license_drv001.jpg', url: '/placeholder.jpg', uploadedAt: '2024-03-15' },
    { imageID: 3, filename: 'uniform_drv001.jpg', url: '/placeholder.jpg', uploadedAt: '2024-04-01' },
  ]
  if (driverID === 2) return [
    { imageID: 4, filename: 'profile_drv002.jpg', url: '/placeholder.jpg', uploadedAt: '2024-03-20' },
    { imageID: 5, filename: 'id_card_drv002.jpg', url: '/placeholder.jpg', uploadedAt: '2024-03-20' },
  ]
  return []
}

interface Props {
  /** The driver's UUID (Fleet API). */
  driverId: string
}

export function DriverImagesClient({ driverId }: Props) {
  const driver = useDriver(driverId)
  if (driver.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  if (!driver.data) return <p className="text-sm text-red-600">Driver not found.</p>
  const images = getMockDriverImages(Number(driverId))
  return (
    <ListPage
      title={`${driver.data.driverName} — Photos`}
      subtitle={`Driver Code: ${driver.data.driverCode}`}
    >
      <div className="p-6">
        <ImageGallery
          images={images}
          onUpload={() => {}}
          uploadDisabled
          uploadDisabledReason="Photo upload available in full API mode"
          emptyMessage="No photos on record for this driver"
        />
      </div>
    </ListPage>
  )
}
