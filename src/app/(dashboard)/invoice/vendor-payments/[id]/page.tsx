import { notFound } from 'next/navigation'
import { getVendorPayment } from '@/lib/data/vendor-payments'
import { VendorPaymentFormClient } from '@/components/vendor-payments/VendorPaymentFormClient'
import { NEW_VENDOR_PAYMENT_DEFAULTS } from '@/types/vendor-payment'
import type { VendorPayment } from '@/types/vendor-payment'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New Vendor Payment | Fleet' }
  const record = await getVendorPayment(parseInt(id, 10))
  return {
    title: record ? `${record.receiptNo} | Fleet` : 'Vendor Payment | Fleet',
  }
}

const NEW_RECORD: VendorPayment = {
  ...NEW_VENDOR_PAYMENT_DEFAULTS,
  vendorPaymentID: 0,
  lines: [],
}

export default async function VendorPaymentDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <VendorPaymentFormClient
        vendorPayment={NEW_RECORD}
        vendorPaymentID="new"
        isNew={true}
      />
    )
  }

  const vendorPaymentID = parseInt(id, 10)
  if (isNaN(vendorPaymentID)) notFound()

  const record = await getVendorPayment(vendorPaymentID)
  if (!record) notFound()

  return (
    <VendorPaymentFormClient
      vendorPayment={record}
      vendorPaymentID={id}
      isNew={false}
    />
  )
}
