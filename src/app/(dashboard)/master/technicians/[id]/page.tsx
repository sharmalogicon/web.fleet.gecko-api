import { TechnicianProfileView } from '@/components/technicians/TechnicianProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Technician | Fleet' : 'Technician | Fleet' }
}

export default async function TechnicianProfilePage({ params }: PageProps) {
  const { id } = await params
  return <TechnicianProfileView id={id} />
}
