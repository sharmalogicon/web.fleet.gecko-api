import { Suspense } from 'react'
import { getEquipmentList } from '@/lib/data/equipment'
import { EquipmentListClient } from '@/components/equipment/EquipmentListClient'
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters'
import { ListPage } from '@/components/shared/ListPage'
import Link from 'next/link'

export const metadata = { title: 'Equipment | Fleet' }

interface PageProps {
  searchParams: Promise<{ code?: string; status?: string; category?: string }>
}

export default async function EquipmentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const equipment = await getEquipmentList({
    code: params.code,
    status: params.status,
    category: params.category,
  })
  return (
    <ListPage
      title="Equipment"
      subtitle={`${equipment.length} unit${equipment.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/master/equipment/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Equipment
        </Link>
      }
      filters={
        <EquipmentFilters
          code={params.code ?? ''}
          status={params.status ?? 'ALL'}
          category={params.category ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <EquipmentListClient initialData={equipment} />
      </Suspense>
    </ListPage>
  )
}
