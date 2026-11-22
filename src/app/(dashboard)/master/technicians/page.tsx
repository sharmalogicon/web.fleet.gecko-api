import { TechniciansListView } from '@/components/technicians/TechniciansListView'

export const metadata = { title: 'Technicians | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; trade?: string; status?: string; branch?: string }>
}

/** Same page structure as Drivers; the list reads the Fleet API in the browser. */
export default async function TechniciansPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <TechniciansListView search={p.search ?? ''} trade={p.trade ?? 'ALL'} status={p.status ?? 'ALL'} branch={p.branch ?? 'ALL'} />
}
