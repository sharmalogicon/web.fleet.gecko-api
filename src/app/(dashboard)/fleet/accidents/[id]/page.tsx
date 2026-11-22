import { AccidentView } from '@/components/accidents/AccidentViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Accident Report | Fleet' : 'Accident Report | Fleet' }
}

export default async function AccidentDetailPage({ params }: PageProps) {
  const { id } = await params
  return <AccidentView id={id} />
}
