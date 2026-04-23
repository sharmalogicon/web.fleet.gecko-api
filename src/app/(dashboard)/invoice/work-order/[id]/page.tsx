import { notFound } from 'next/navigation'
import { getWOInvoice } from '@/lib/data/wo-invoices'
import { WOInvoiceFormClient } from '@/components/wo-invoices/WOInvoiceFormClient'
import { NEW_WO_INVOICE_DEFAULTS } from '@/types/wo-invoice'
import type { WOInvoice } from '@/types/wo-invoice'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (id === 'new') return { title: 'New WO Invoice | Fleet' }
  const record = await getWOInvoice(parseInt(id, 10))
  return {
    title: record ? `${record.receiptNo} | Fleet` : 'WO Invoice | Fleet',
  }
}

const NEW_RECORD: WOInvoice = {
  ...NEW_WO_INVOICE_DEFAULTS,
  woInvoiceID: 0,
  status: 'ACTIVE',
  lines: [],
}

export default async function WOInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params

  if (id === 'new') {
    return (
      <WOInvoiceFormClient
        woInvoice={NEW_RECORD}
        woInvoiceID="new"
        isNew={true}
      />
    )
  }

  const woInvoiceID = parseInt(id, 10)
  if (isNaN(woInvoiceID)) notFound()

  const record = await getWOInvoice(woInvoiceID)
  if (!record) notFound()

  return (
    <WOInvoiceFormClient
      woInvoice={record}
      woInvoiceID={id}
      isNew={false}
    />
  )
}
