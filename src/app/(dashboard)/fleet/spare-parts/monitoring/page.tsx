import { Suspense } from 'react'
import { getSparePartsMonitor } from '@/lib/data/spare-parts-monitor'
import { SparePartsMonitorClient } from '@/components/spare-parts/SparePartsMonitorClient'
import { SparePartsMonitorFilters } from '@/components/spare-parts/SparePartsMonitorFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Spare Parts Monitoring | Fleet' }

interface PageProps {
  searchParams: Promise<{
    workOrderNo?: string
    equipmentCode?: string
    status?: string
  }>
}

export default async function SparePartsMonitoringPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const records = await getSparePartsMonitor({
    workOrderNo: params.workOrderNo,
    equipmentCode: params.equipmentCode,
    status: params.status,
  })

  return (
    <ListPage
      title={t('nav.spareParts')}
      subtitle={`${records.length} record${records.length !== 1 ? 's' : ''} found`}
      filters={
        <SparePartsMonitorFilters
          workOrderNo={params.workOrderNo ?? ''}
          equipmentCode={params.equipmentCode ?? ''}
          status={params.status ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <SparePartsMonitorClient initialData={records} />
      </Suspense>
    </ListPage>
  )
}
