import { notFound } from 'next/navigation'
import { getVendorInvoice } from '@/lib/data/vendor-invoices'
import { VendorInvoiceFormClient } from '@/components/vendor-invoices/VendorInvoiceFormClient'
import { NEW_VENDOR_INVOICE_DEFAULTS } from '@/types/vendor-invoice'
import type { VendorInvoice } from '@/types/vendor-invoice'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Vendor Invoice | Fleet' }
  const record = await getVendorInvoice(parseInt(id, 10))
  return {
    title: record ? `${record.documentNo} | Fleet` : 'Vendor Invoice | Fleet',
  }
}

const NEW_RECORD: VendorInvoice = {
  ...NEW_VENDOR_INVOICE_DEFAULTS,
  vendorInvoiceID: 0,
  status: 'ACTIVE',
  lines: [],
}

export default async function VendorInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <VendorInvoiceFormClient
        vendorInvoice={NEW_RECORD}
        vendorInvoiceID="new"
        isNew={true}
      />
    )
  }

  const vendorInvoiceID = parseInt(id, 10)
  if (isNaN(vendorInvoiceID)) notFound()

  const record = await getVendorInvoice(vendorInvoiceID)
  if (!record) notFound()

  return (
    <VendorInvoiceFormClient
      vendorInvoice={record}
      vendorInvoiceID={id}
      isNew={false}
    />
  )
}
