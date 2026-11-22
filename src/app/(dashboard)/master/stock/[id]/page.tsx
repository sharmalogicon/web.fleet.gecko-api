import { StockProfileView } from '@/components/stock/StockProfileView'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Stock Item | Fleet' : 'Stock Item | Fleet' }
}

export default async function StockProfilePage({ params }: PageProps) {
  const { id } = await params
  return <StockProfileView id={id} />
}
