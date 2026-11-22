import { RepairTariffListView } from '@/components/tariff/RepairTariffViews'

export const metadata = { title: 'Customer Rates | Tariff' }

interface PageProps {
  searchParams: Promise<{ quotationNo?: string; customerName?: string; status?: string; dateFrom?: string; dateTo?: string }>
}

/** Per-customer repair tariff cards (`standard=false`, prompt 12 §A). */
export default async function CustomerRatesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return (
    <RepairTariffListView variant="customer" code={p.quotationNo ?? ''} party={p.customerName ?? ''} description="" status={p.status ?? ''} dateFrom={p.dateFrom ?? ''} dateTo={p.dateTo ?? ''} />
  )
}
