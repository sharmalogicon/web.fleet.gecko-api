import { notFound } from 'next/navigation'
import { getTireMaintenance } from '@/lib/data/tire-maintenance'
import { TireMaintenanceFormClient } from '@/components/tire-maintenance/TireMaintenanceFormClient'
import { NEW_TIRE_MAINTENANCE_DEFAULTS } from '@/types/tire-maintenance'
import type { TireMaintenance } from '@/types/tire-maintenance'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Tire Maintenance | Fleet' }
  const record = await getTireMaintenance(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Tire Maintenance | Fleet',
  }
}

const NEW_RECORD: TireMaintenance = {
  ...NEW_TIRE_MAINTENANCE_DEFAULTS,
  maintenanceID: 0,
  lines: [],
}

export default async function TireMaintenanceDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <TireMaintenanceFormClient
        tireMaintenance={NEW_RECORD}
        maintenanceID="new"
        isNew={true}
      />
    )
  }

  const maintenanceID = parseInt(id, 10)
  if (isNaN(maintenanceID)) notFound()

  const record = await getTireMaintenance(maintenanceID)
  if (!record) notFound()

  return (
    <TireMaintenanceFormClient
      tireMaintenance={record}
      maintenanceID={id}
      isNew={false}
    />
  )
}
