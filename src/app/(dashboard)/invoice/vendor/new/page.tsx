import { VendorInvoiceFormClient } from '@/components/vendor-invoices/VendorInvoiceFormClient'
import { NEW_VENDOR_INVOICE_DEFAULTS } from '@/types/vendor-invoice'
import type { VendorInvoice } from '@/types/vendor-invoice'

export const metadata = { title: 'New Vendor Invoice | Fleet' }

interface PageProps {
  searchParams: Promise<{ grNo?: string }>
}

export default async function NewVendorInvoicePage({ searchParams }: PageProps) {
  const params = await searchParams

  const NEW_RECORD: VendorInvoice = {
    ...NEW_VENDOR_INVOICE_DEFAULTS,
    vendorInvoiceID: 0,
    status: 'ACTIVE',
    lines: [],
    // Pre-fill vendorInvoiceRef from grNo if coming from unbilled list
    remarks: params.grNo ? `Created from GR: ${params.grNo}` : '',
  }

  return (
    <VendorInvoiceFormClient
      vendorInvoice={NEW_RECORD}
      vendorInvoiceID="new"
      isNew={true}
    />
  )
}
