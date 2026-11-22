import { WOInvoiceView } from '@/components/wo-invoices/WOInvoiceViews'

export const metadata = { title: 'WO Invoice | Fleet' }

export default async function WOInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WOInvoiceView id={id} />
}
