import { EquipmentProfileView } from '@/components/equipment/EquipmentProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Equipment | Fleet' : 'Equipment | Fleet' }
}

/** `id` is the asset's UUID (assetProfileId) or "new"; the record is read in the browser. */
export default async function EquipmentProfilePage({ params }: PageProps) {
  const { id } = await params
  return <EquipmentProfileView id={id} />
}
