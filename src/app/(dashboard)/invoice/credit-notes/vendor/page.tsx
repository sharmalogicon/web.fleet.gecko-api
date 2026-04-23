import { Suspense } from 'react'
import { getVendorCreditNotes } from '@/lib/data/vendor-credit-notes'
import { VendorCreditNoteListClient } from '@/components/credit-notes/VendorCreditNoteListClient'
import { VendorCreditNoteFilters } from '@/components/credit-notes/VendorCreditNoteFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Vendor Credit Notes | Fleet' }

interface PageProps {
  searchParams: Promise<{
    creditNoteNo?: string
    vendorName?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function VendorCreditNotesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const records = await getVendorCreditNotes({
    creditNoteNo: params.creditNoteNo,
    vendorName: params.vendorName,
    status: params.status,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="Vendor Credit Notes"
      subtitle={`${records.length} vendor credit note${records.length !== 1 ? 's' : ''} found`}
      filters={
        <VendorCreditNoteFilters
          creditNoteNo={params.creditNoteNo ?? ''}
          vendorName={params.vendorName ?? ''}
          status={params.status ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <VendorCreditNoteListClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
