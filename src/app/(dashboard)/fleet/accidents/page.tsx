import { AccidentsListView } from '@/components/accidents/AccidentViews'

export const metadata = { title: 'Accident Reports | Fleet' }

interface PageProps {
  searchParams: Promise<{ equipmentCode?: string; driverName?: string; accidentType?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Accident reports from the Fleet API, read in the browser. */
export default async function AccidentsPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <AccidentsListView equipmentCode={p.equipmentCode ?? ''} driverName={p.driverName ?? ''} accidentType={p.accidentType ?? ''}
      status={p.status ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
  )
}
