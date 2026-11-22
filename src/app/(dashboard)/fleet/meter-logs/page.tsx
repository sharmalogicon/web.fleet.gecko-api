import { MeterLogsListView } from '@/components/meter-logs/MeterLogsView'

export const metadata = { title: 'Meter Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{ equipment?: string; meterType?: string; dateFrom?: string; dateTo?: string }>
}

/** Odometer readings from the Fleet API (append-only ledger), read in the browser. */
export default async function MeterLogsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <MeterLogsListView equipment={p.equipment ?? ''} meterType={p.meterType ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
