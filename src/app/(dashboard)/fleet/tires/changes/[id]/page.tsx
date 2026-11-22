import { TyreDocumentView } from '@/components/tire-changes/TyreDocumentViews'

export const metadata = { title: 'Tyre changes | Fleet' }

/** Posted at once: a saved document is read-only; `new` opens the entry form. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TyreDocumentView kind="CHANGE" id={id} />
}
