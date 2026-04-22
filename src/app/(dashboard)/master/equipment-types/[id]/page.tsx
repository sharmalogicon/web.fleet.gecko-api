import { notFound } from 'next/navigation'
import { getEquipmentType } from '@/lib/data/equipment-types'
import { EquipmentTypeFormClient } from '@/components/equipment-types/EquipmentTypeFormClient'
import { NEW_EQUIPMENT_TYPE_DEFAULTS } from '@/types/equipment-type'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Equipment Type | Fleet' }
  const r = await getEquipmentType(parseInt(id, 10))
  return { title: r ? `${r.equipmentTypeSize} | Fleet` : 'Equipment Type | Fleet' }
}

export default async function EquipmentTypeDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <EquipmentTypeFormClient
        record={NEW_EQUIPMENT_TYPE_DEFAULTS}
        recordID="new"
        isNew={true}
      />
    )
  }

  const rid = parseInt(id, 10)
  if (isNaN(rid)) notFound()

  const r = await getEquipmentType(rid)
  if (!r) notFound()

  return <EquipmentTypeFormClient record={r} recordID={id} isNew={false} />
}
