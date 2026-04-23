import { WOInvoiceFormClient } from '@/components/wo-invoices/WOInvoiceFormClient'
import { NEW_WO_INVOICE_DEFAULTS } from '@/types/wo-invoice'
import type { WOInvoice } from '@/types/wo-invoice'

export const metadata = { title: 'New WO Invoice | Fleet' }

const NEW_RECORD: WOInvoice = {
  ...NEW_WO_INVOICE_DEFAULTS,
  woInvoiceID: 0,
  status: 'ACTIVE',
  lines: [],
}

export default function NewWOInvoicePage() {
  return (
    <WOInvoiceFormClient
      woInvoice={NEW_RECORD}
      woInvoiceID="new"
      isNew={true}
    />
  )
}
