import { Suspense } from 'react'
import Link from 'next/link'
import { getEquipmentTypes } from '@/lib/data/equipment-types'
import { EquipmentTypeListClient } from '@/components/equipment-types/EquipmentTypeListClient'
import { EquipmentTypeFilters } from '@/components/equipment-types/EquipmentTypeFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Equipment Types | Fleet' }

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function EquipmentTypesPage({ searchParams }: PageProps) {
  const { search } = await searchParams
  const { t } = await getT()
  const records = await getEquipmentTypes({ search })

  return (
    <ListPage
      title={t('nav.equipmentTypes')}
      subtitle={`${records.length} type${records.length !== 1 ? 's' : ''}`}
      actions={
        <Link
          href="/master/equipment-types/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.equipmentTypes')}
        </Link>
      }
      filters={<EquipmentTypeFilters search={search ?? ''} />}
    >
      <Suspense fallback={null}>
        <EquipmentTypeListClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
