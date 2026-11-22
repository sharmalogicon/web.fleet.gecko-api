import { TyreProfileView } from '@/components/tire-profiles/TyreProfileViews'

export const metadata = { title: 'Tyre Profile | Fleet' }

export default async function TyreProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TyreProfileView id={id} />
}
