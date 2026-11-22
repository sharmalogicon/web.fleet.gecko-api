import { WorkRequestsListView } from '@/components/work-requests/WorkRequestViews'

export const metadata = { title: 'Work Requests | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Work requests from the Fleet API, read in the browser. */
export default async function WorkRequestsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <WorkRequestsListView documentNo={p.documentNo ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
