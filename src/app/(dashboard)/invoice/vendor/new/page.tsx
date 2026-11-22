import { Suspense } from 'react'
import { VendorInvoiceView } from '@/components/vendor-invoices/VendorInvoiceViews'

export const metadata = { title: 'New Vendor Invoice | Fleet' }

/** `?supplier=&branch=&pick=` (from Unbilled) pre-selects that row's lines. */
export default function NewVendorInvoicePage() {
  return <Suspense fallback={null}><VendorInvoiceView id="new" /></Suspense>
}
