import { notFound } from 'next/navigation'
import { getEquipment } from '@/lib/data/equipment'
import { EquipmentProfileClient } from '@/components/equipment/EquipmentProfileClient'
import { NEW_EQUIPMENT_DEFAULTS } from '@/types/equipment'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Equipment | Fleet' }
  const eq = await getEquipment(parseInt(id, 10))
  return { title: eq ? `${eq.code} | Fleet` : 'Equipment | Fleet' }
}

export default async function EquipmentProfilePage({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') {
    return (
      <EquipmentProfileClient equipment={NEW_EQUIPMENT_DEFAULTS} equipmentID="new" isNew={true} />
    )
  }
  const equipmentID = parseInt(id, 10)
  if (isNaN(equipmentID)) notFound()
  const eq = await getEquipment(equipmentID)
  if (!eq) notFound()
  return <EquipmentProfileClient equipment={eq} equipmentID={id} isNew={false} />
}
