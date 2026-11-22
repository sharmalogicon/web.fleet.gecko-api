import { TransporterProfileView } from '@/components/transporters/TransporterProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Transporter | Fleet' : 'Transporter | Fleet' }
}

/** `id` is the supplier's party code (e.g. SUP-0001) or "new". */
export default async function TransporterProfilePage({ params }: PageProps) {
  const { id } = await params
  return <TransporterProfileView id={decodeURIComponent(id)} />
}
