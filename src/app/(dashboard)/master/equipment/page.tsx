import { EquipmentListView } from '@/components/equipment/EquipmentListView'

export const metadata = { title: 'Equipment | Fleet' }

interface PageProps {
  searchParams: Promise<{ code?: string; status?: string; category?: string }>
}

/** The list reads the Fleet API in the browser (the token lives in browser memory only). */
export default async function EquipmentPage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <EquipmentListView
      code={params.code ?? ''}
      status={params.status ?? 'ALL'}
      category={params.category ?? 'ALL'}
    />
  )
}
