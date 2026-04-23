import { Suspense } from 'react'
import Link from 'next/link'
import { getMeterLogs } from '@/lib/data/meter-logs'
import { MeterLogListClient } from '@/components/meter-logs/MeterLogListClient'
import { MeterLogFilters } from '@/components/meter-logs/MeterLogFilters'
import { ListPage } from '@/components/shared/ListPage'

export const metadata = { title: 'Meter Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{
    equipment?: string
    meterType?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function MeterLogsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const meterLogs = await getMeterLogs({
    equipmentCode: params.equipment,
    meterType: params.meterType,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title="Meter Logs"
      subtitle={`${meterLogs.length} meter log${meterLogs.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/meter-logs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Meter Log
        </Link>
      }
      filters={
        <MeterLogFilters
          equipmentCode={params.equipment ?? ''}
          meterType={params.meterType ?? 'ALL'}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <MeterLogListClient initialData={meterLogs} />
      </Suspense>
    </ListPage>
  )
}
