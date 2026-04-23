import { Suspense } from 'react'
import Link from 'next/link'
import { getFuelLogs } from '@/lib/data/fuel-logs'
import { FuelLogListClient } from '@/components/fuel-logs/FuelLogListClient'
import { FuelLogFilters } from '@/components/fuel-logs/FuelLogFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Fuel Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{
    equipment?: string
    dateFrom?: string
    dateTo?: string
    status?: string
  }>
}

export default async function FuelLogsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const fuelLogs = await getFuelLogs({
    equipmentCode: params.equipment,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status,
  })

  return (
    <ListPage
      title={t('nav.fuelLogs')}
      subtitle={`${fuelLogs.length} fuel log${fuelLogs.length !== 1 ? 's' : ''} found`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/fleet/fuel-logs/approval"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
          >
            Approval Queue
          </Link>
          <Link
            href="/fleet/fuel-logs/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + {t('nav.fuelLogs')}
          </Link>
        </div>
      }
      filters={
        <FuelLogFilters
          equipmentCode={params.equipment ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
          status={params.status ?? 'ALL'}
        />
      }
    >
      <Suspense fallback={null}>
        <FuelLogListClient initialData={fuelLogs} />
      </Suspense>
    </ListPage>
  )
}
