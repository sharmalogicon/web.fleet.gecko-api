import { VendorCreditNotesListView } from '@/components/credit-notes/VendorCreditNoteViews'

export const metadata = { title: 'Vendor Credit Notes | Fleet' }

interface PageProps {
  searchParams: Promise<{ creditNoteNo?: string; vendorName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Vendor credit notes from the Fleet API (prompt 15 §C). */
export default async function VendorCreditNotesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <VendorCreditNotesListView creditNoteNo={p.creditNoteNo ?? ''} vendorName={p.vendorName ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
