import { InspectionsListView } from '@/components/inspections/InspectionPages'

export const metadata = { title: 'Inspections | Fleet' }

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const p = await searchParams
  return <InspectionsListView result={p.result ?? 'ALL'} />
}
