import { Suspense } from 'react'
import { VendorInvoiceView } from '@/components/vendor-invoices/VendorInvoiceViews'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  return { title: id === 'new' ? 'New Vendor Invoice | Fleet' : 'Vendor Invoice | Fleet' }
}

export default async function VendorInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  return <Suspense fallback={null}><VendorInvoiceView id={id} /></Suspense>
}
