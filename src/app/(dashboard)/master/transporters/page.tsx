import { TransportersListView } from '@/components/transporters/TransportersListView'

export const metadata = { title: 'Transporters | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

/** Suppliers in category TRANSPORT (Platform API), read in the browser. */
export default async function TransportersPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <TransportersListView search={params.search ?? ''} />
}
