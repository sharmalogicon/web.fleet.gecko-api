import { StoreProfileView } from '@/components/stores/StoreProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Store | Fleet' : 'Store | Fleet' }
}

export default async function StorePage({ params }: PageProps) {
  const { id } = await params
  return <StoreProfileView id={id} />
}
