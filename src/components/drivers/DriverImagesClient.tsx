'use client'

import type { Driver } from '@/types/driver'
import { ImageGallery } from '@/components/shared/ImageGallery'
import { ListPage } from '@/components/shared/ListPage'

interface DriverImage {
  imageID: number
  filename: string
  url: string
  uploadedAt: string
}

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
  driver: Driver
}

export function DriverImagesClient({ driver }: Props) {
  const images = getMockDriverImages(driver.driverID)
  return (
    <ListPage
      title={`${driver.driverName} — Photos`}
      subtitle={`Driver Code: ${driver.driverCode}`}
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
