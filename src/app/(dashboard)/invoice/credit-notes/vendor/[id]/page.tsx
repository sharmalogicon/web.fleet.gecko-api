import { notFound } from 'next/navigation'
import { getVendorCreditNote } from '@/lib/data/vendor-credit-notes'
import { VendorCreditNoteFormClient } from '@/components/credit-notes/VendorCreditNoteFormClient'
import { NEW_VENDOR_CREDIT_NOTE_DEFAULTS } from '@/types/vendor-credit-note'
import type { VendorCreditNote } from '@/types/vendor-credit-note'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Vendor Credit Note | Fleet' }
  const record = await getVendorCreditNote(parseInt(id, 10))
  return {
    title: record ? `${record.creditNoteNo} | Fleet` : 'Vendor Credit Note | Fleet',
  }
}

const NEW_RECORD: VendorCreditNote = {
  ...NEW_VENDOR_CREDIT_NOTE_DEFAULTS,
  vendorCreditNoteID: 0,
  status: 'ACTIVE',
  lines: [],
}

export default async function VendorCreditNoteDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <VendorCreditNoteFormClient
        vendorCreditNote={NEW_RECORD}
        vendorCreditNoteID="new"
        isNew={true}
      />
    )
  }

  const vendorCreditNoteID = parseInt(id, 10)
  if (isNaN(vendorCreditNoteID)) notFound()

  const record = await getVendorCreditNote(vendorCreditNoteID)
  if (!record) notFound()

  return (
    <VendorCreditNoteFormClient
      vendorCreditNote={record}
      vendorCreditNoteID={id}
      isNew={false}
    />
  )
}
