import { TyreDocumentsListView } from '@/components/tire-changes/TyreDocumentViews'

export const metadata = { title: 'Tyre changes | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; equipmentCode?: string; dateFrom?: string; dateTo?: string }>
}

/** Tyre documents kind=CHANGE on `/api/fleet/tyre-documents` (prompt 13 §C). */
export default async function Page({ searchParams }: PageProps) {
  const p = await searchParams
  return <TyreDocumentsListView kind="CHANGE" documentNo={p.documentNo ?? ''} party={p.equipmentCode ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
