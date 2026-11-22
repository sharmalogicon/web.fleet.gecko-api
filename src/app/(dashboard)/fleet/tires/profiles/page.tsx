import { TyreProfilesListView } from '@/components/tire-profiles/TyreProfileViews'

export const metadata = { title: 'Tyre Profiles | Fleet' }

interface PageProps {
  searchParams: Promise<{ serialNo?: string; brand?: string; tyreStatus?: string; isActive?: string }>
}

/** The tyre register on `/api/fleet/tyres` (prompt 13 §B). */
export default async function TyreProfilesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <TyreProfilesListView serialNo={p.serialNo ?? ''} brand={p.brand ?? ''} tyreStatus={p.tyreStatus ?? 'ALL'} isActive={p.isActive ?? 'ALL'} />
}
