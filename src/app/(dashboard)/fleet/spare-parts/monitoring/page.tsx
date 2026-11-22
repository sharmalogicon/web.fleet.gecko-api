import { SparePartsMonitorView } from '@/components/spare-parts/SparePartsMonitorView'

export const metadata = { title: 'Spare Parts Monitoring | Fleet' }

interface PageProps {
  searchParams: Promise<{ workOrderNo?: string; equipmentCode?: string; status?: string }>
}

/** Read-only, on `/api/fleet/stock-issues` (prompt 11 §I). */
export default async function SparePartsMonitoringPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <SparePartsMonitorView workOrderNo={p.workOrderNo ?? ''} equipmentCode={p.equipmentCode ?? ''} status={p.status ?? 'ALL'} />
}
