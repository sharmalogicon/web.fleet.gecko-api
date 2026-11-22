import { Suspense } from 'react'
import { VendorCreditNoteView } from '@/components/credit-notes/VendorCreditNoteViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Vendor Credit Note | Fleet' : 'Vendor Credit Note | Fleet' }
}

/** "new" (optionally `?invoiceId=`) starts a credit note; an id opens it. */
export default async function VendorCreditNoteDetailPage({ params }: PageProps) {
  const { id } = await params
  return <Suspense fallback={null}><VendorCreditNoteView id={id} /></Suspense>
}
