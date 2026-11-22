import { PMSchedulerListView } from '@/components/pm-scheduler/PMSchedulerViews'

export const metadata = { title: 'PM Scheduler | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string; serviceType?: string }>
}

/** PM programs from the Fleet API, read in the browser. */
export default async function PMSchedulerPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <PMSchedulerListView search={p.search ?? ''} category={p.serviceType ?? ''} />
}
