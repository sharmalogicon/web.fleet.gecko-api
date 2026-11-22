import { WOInvoicesListView } from '@/components/wo-invoices/WOInvoiceViews'

export const metadata = { title: 'WO Invoices | Fleet' }

interface PageProps {
  searchParams: Promise<{ receiptNo?: string; customerName?: string; status?: string; dateFrom?: string; dateTo?: string; source?: string }>
}

/** Revenue invoices of fleet recharges (Platform API, prompt 12 §D). */
export default async function WOInvoicesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <WOInvoicesListView receiptNo={p.receiptNo ?? ''} customerName={p.customerName ?? ''} status={p.status ?? 'ALL'} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} source={p.source ?? 'WO'} />
}
