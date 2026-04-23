import { Suspense } from 'react'
import Link from 'next/link'
import { getTireMaintenanceList } from '@/lib/data/tire-maintenance'
import { TireMaintenanceListClient } from '@/components/tire-maintenance/TireMaintenanceListClient'
import { TireMaintenanceFilters } from '@/components/tire-maintenance/TireMaintenanceFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Tire Maintenance | Fleet' }

interface PageProps {
  searchParams: Promise<{
    documentNo?: string
    equipmentCode?: string
    vendorName?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TireMaintenancePage({ searchParams }: PageProps) {
  const params = await searchParams
  const records = await getTireMaintenanceList({
    documentNo: params.documentNo,
    equipmentCode: params.equipmentCode,
    vendorName: params.vendorName,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="Tire Maintenance"
      subtitle={`${records.length} record${records.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/tires/maintenance/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Maintenance
        </Link>
      }
      filters={
        <TireMaintenanceFilters
          documentNo={params.documentNo ?? ''}
          vendorName={params.vendorName ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <TireMaintenanceListClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
