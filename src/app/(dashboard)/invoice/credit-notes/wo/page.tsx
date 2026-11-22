import { WOCreditNotesListView } from '@/components/credit-notes/WOCreditNoteViews'

export const metadata = { title: 'WO Credit Notes | Fleet' }

interface PageProps {
  searchParams: Promise<{ creditNoteNo?: string; customerName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** WO credit notes on the Platform Revenue API, source FLEET (prompt 21). */
export default async function WOCreditNotesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <WOCreditNotesListView creditNoteNo={p.creditNoteNo ?? ''} customerName={p.customerName ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
}
