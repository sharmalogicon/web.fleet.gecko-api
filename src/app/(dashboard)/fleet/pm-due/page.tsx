import { PmDueListView } from '@/components/pm-due/PmDueListView'

export const metadata = { title: 'PM Due | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; dueOnly?: string; branch?: string }>
}

/** New page (prompt 08 §C): PM due today, read in the browser. Default: due or late only. */
export default async function PmDuePage({ searchParams }: PageProps) {
  const p = await searchParams
  return <PmDueListView search={p.search ?? ''} status={p.status ?? 'ALL'} dueOnly={p.dueOnly !== 'false'} branch={p.branch ?? 'ALL'} />
}
