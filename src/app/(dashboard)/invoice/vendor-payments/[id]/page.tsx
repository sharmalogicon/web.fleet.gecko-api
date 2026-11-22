import { Suspense } from 'react'
import { VendorPaymentView } from '@/components/vendor-payments/VendorPaymentViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'Record Payment | Fleet' : 'Vendor Payment | Fleet' }
}

/** "new" (optionally `?invoiceId=`) records a payment; an id shows it. */
export default async function VendorPaymentDetailPage({ params }: PageProps) {
  const { id } = await params
  return <Suspense fallback={null}><VendorPaymentView id={id} /></Suspense>
}
