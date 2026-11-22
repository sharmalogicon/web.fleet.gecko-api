import { WOCreditNoteView } from '@/components/credit-notes/WOCreditNoteViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New WO Credit Note | Fleet' : 'WO Credit Note | Fleet' }
}

/** "new" issues a credit note against an issued WO invoice; an id opens one (read-only, Cancel). */
export default async function WOCreditNoteDetailPage({ params }: PageProps) {
  const { id } = await params
  return <WOCreditNoteView id={id} />
}
