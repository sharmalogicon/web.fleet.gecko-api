import { notFound } from 'next/navigation'
import { getWOCreditNote } from '@/lib/data/wo-credit-notes'
import { WOCreditNoteFormClient } from '@/components/credit-notes/WOCreditNoteFormClient'
import { NEW_WO_CREDIT_NOTE_DEFAULTS } from '@/types/wo-credit-note'
import type { WOCreditNote } from '@/types/wo-credit-note'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New WO Credit Note | Fleet' }
  const record = await getWOCreditNote(parseInt(id, 10))
  return {
    title: record ? `${record.creditNoteNo} | Fleet` : 'WO Credit Note | Fleet',
  }
}

const NEW_RECORD: WOCreditNote = {
  ...NEW_WO_CREDIT_NOTE_DEFAULTS,
  woCreditNoteID: 0,
  status: 'ACTIVE',
  lines: [],
}

export default async function WOCreditNoteDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <WOCreditNoteFormClient
        woCreditNote={NEW_RECORD}
        woCreditNoteID="new"
        isNew={true}
      />
    )
  }

  const woCreditNoteID = parseInt(id, 10)
  if (isNaN(woCreditNoteID)) notFound()

  const record = await getWOCreditNote(woCreditNoteID)
  if (!record) notFound()

  return (
    <WOCreditNoteFormClient
      woCreditNote={record}
      woCreditNoteID={id}
      isNew={false}
    />
  )
}
