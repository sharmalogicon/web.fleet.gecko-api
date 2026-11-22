import { ReturnView } from '@/components/return-to-vendor/ReturnViews'

export const metadata = { title: 'Return to Vendor | Fleet' }

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReturnView id={id} />
}
