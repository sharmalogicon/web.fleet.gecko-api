import { DefectsListView } from '@/components/inspections/DefectsListView'

export const metadata = { title: 'Defects | Fleet' }

export default async function DefectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const p = await searchParams
  return <DefectsListView status={p.status ?? 'OPEN'} />
}
