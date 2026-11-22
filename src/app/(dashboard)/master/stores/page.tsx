import { StoresListView } from '@/components/stores/StoresListView'

export const metadata = { title: 'Stores | Fleet' }

interface PageProps {
  searchParams: Promise<{ branch?: string; status?: string }>
}

/** New master page (prompt 07 §C): stores and their bins, read in the browser. */
export default async function StoresPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <StoresListView branch={p.branch ?? 'ALL'} status={p.status ?? 'ALL'} />
}
