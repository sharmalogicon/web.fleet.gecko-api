import { Suspense } from 'react'
import { getWOCreditNotes } from '@/lib/data/wo-credit-notes'
import { WOCreditNoteListClient } from '@/components/credit-notes/WOCreditNoteListClient'
import { WOCreditNoteFilters } from '@/components/credit-notes/WOCreditNoteFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'WO Credit Notes | Fleet' }

interface PageProps {
  searchParams: Promise<{
    creditNoteNo?: string
    customerName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function WOCreditNotesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const records = await getWOCreditNotes({
    creditNoteNo: params.creditNoteNo,
    customerName: params.customerName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="WO Credit Notes"
      subtitle={`${records.length} WO credit note${records.length !== 1 ? 's' : ''} found`}
      filters={
        <WOCreditNoteFilters
          creditNoteNo={params.creditNoteNo ?? ''}
          customerName={params.customerName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <WOCreditNoteListClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
