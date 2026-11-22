import { DriversListView } from '@/components/drivers/DriversListView'

interface PageProps {
  searchParams: Promise<{ name?: string; status?: string; branch?: string }>
}

export const metadata = { title: 'Drivers | Fleet' }

/** The list reads the Fleet API in the browser (the token lives in browser memory only). */
export default async function DriversPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <DriversListView name={params.name ?? ''} status={params.status ?? 'ALL'} branch={params.branch ?? 'ALL'} />
}
