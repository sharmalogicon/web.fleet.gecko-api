import { WorkOrdersListView } from '@/components/work-orders/WorkOrderViews'

export const metadata = { title: 'Work Orders | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; status?: string; serviceTypeCategory?: string; dateFrom?: string; dateTo?: string }>
}

/** Work orders from the Fleet API, read in the browser. */
export default async function WorkOrdersPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <WorkOrdersListView documentNo={p.documentNo ?? ''} status={p.status ?? 'ALL'} serviceTypeCategory={p.serviceTypeCategory ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
