import { MeterHrLogsListView } from '@/components/meter-hr-logs/MeterHrLogsView'

export const metadata = { title: 'Meter Hour Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{ equipment?: string; dateFrom?: string; dateTo?: string }>
}

/** Hour-meter readings from the Fleet API (append-only ledger), read in the browser. */
export default async function MeterHrLogsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <MeterHrLogsListView equipment={p.equipment ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
