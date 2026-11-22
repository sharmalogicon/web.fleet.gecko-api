import { WorkRequestView } from '@/components/work-requests/WorkRequestViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Work Request | Fleet' : 'Work Request | Fleet' }
}

export default async function WorkRequestPage({ params }: PageProps) {
  const { id } = await params
  return <WorkRequestView id={id} />
}
