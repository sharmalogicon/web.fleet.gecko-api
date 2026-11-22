import { ViolationsListView } from '@/components/traffic-violations/ViolationViews'

export const metadata = { title: 'Traffic Violations | Fleet' }

interface PageProps {
  searchParams: Promise<{ ticketNo?: string; equipmentCode?: string; violationType?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Traffic violations from the Fleet API, read in the browser. */
export default async function TrafficViolationsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <ViolationsListView ticketNo={p.ticketNo ?? ''} equipmentCode={p.equipmentCode ?? ''} violationType={p.violationType ?? ''}
      status={p.status ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
  )
}
