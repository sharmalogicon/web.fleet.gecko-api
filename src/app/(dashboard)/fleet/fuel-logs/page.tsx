import { FuelLogsListView } from '@/components/fuel-logs/FuelLogViews'

export const metadata = { title: 'Fuel Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{ equipment?: string; dateFrom?: string; dateTo?: string; status?: string }>
}

/** Fuel logs from the Fleet API, read in the browser. */
export default async function FuelLogsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <FuelLogsListView equipmentCode={p.equipment ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} status={p.status ?? 'ALL'} />
}
