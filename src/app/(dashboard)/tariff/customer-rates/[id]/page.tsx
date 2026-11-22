import { RepairTariffView } from '@/components/tariff/RepairTariffViews'

export const metadata = { title: 'Repair Tariff | Tariff' }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ copyFrom?: string }>
}

/** A repair tariff card (prompt 12 §A); `new?copyFrom=` = "Copy to new card". */
export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params
  const { copyFrom } = await searchParams
  return <RepairTariffView variant="customer" id={id} copyFrom={copyFrom} />
}
