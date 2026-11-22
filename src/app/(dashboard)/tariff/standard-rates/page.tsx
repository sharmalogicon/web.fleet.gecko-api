import { RepairTariffListView } from '@/components/tariff/RepairTariffViews'

export const metadata = { title: 'Standard Rates | Tariff' }

interface PageProps {
  searchParams: Promise<{ rateCode?: string; description?: string; status?: string }>
}

/** The standard repair tariff cards (`standard=true`, no party; prompt 12 §A). */
export default async function StandardRatesPage({ searchParams }: PageProps) {
  const p = await searchParams
  return <RepairTariffListView variant="standard" code={p.rateCode ?? ''} party="" description={p.description ?? ''} status={p.status ?? ''} dateFrom="" dateTo="" />
}
