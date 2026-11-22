import { InspectionView } from '@/components/inspections/InspectionPages'

export const metadata = { title: 'Inspection | Fleet' }

/** "new" = the inspection form; an id = the read-only inspection with its defects. */
export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InspectionView id={id} />
}
