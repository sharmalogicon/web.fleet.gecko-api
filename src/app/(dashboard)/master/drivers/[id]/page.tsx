import { DriverProfileView } from '@/components/drivers/DriverProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Driver | Fleet' : 'Driver | Fleet' }
}

/** `id` is the driver's UUID or "new"; the record is read in the browser. */
export default async function DriverProfilePage({ params }: PageProps) {
  const { id } = await params
  return <DriverProfileView id={id} />
}
