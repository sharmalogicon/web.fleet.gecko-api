import { TyreDocumentsListView } from '@/components/tire-changes/TyreDocumentViews'

export const metadata = { title: 'Tyre maintenance | Fleet' }

interface PageProps {
  searchParams: Promise<{ documentNo?: string; vendorName?: string; dateFrom?: string; dateTo?: string }>
}

/** Tyre documents kind=MAINTENANCE on `/api/fleet/tyre-documents` (prompt 13 §C). */
export default async function Page({ searchParams }: PageProps) {
  const p = await searchParams
  return <TyreDocumentsListView kind="MAINTENANCE" documentNo={p.documentNo ?? ''} party={p.vendorName ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
