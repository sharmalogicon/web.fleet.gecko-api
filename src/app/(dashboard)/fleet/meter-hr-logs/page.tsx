import { Suspense } from 'react'
import Link from 'next/link'
import { getMeterHrLogs } from '@/lib/data/meter-hr-logs'
import { MeterHrLogListClient } from '@/components/meter-hr-logs/MeterHrLogListClient'
import { MeterHrLogFilters } from '@/components/meter-hr-logs/MeterHrLogFilters'
import { ListPage } from '@/components/shared/ListPage'
import { getT } from '@/i18n/server'

export const metadata = { title: 'Meter Hour Logs | Fleet' }

interface PageProps {
  searchParams: Promise<{
    equipment?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function MeterHrLogsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { t } = await getT()
  const meterHrLogs = await getMeterHrLogs({
    equipmentCode: params.equipment,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  return (
    <ListPage
      title={t('nav.meterHrLogs')}
      subtitle={`${meterHrLogs.length} meter hour log${meterHrLogs.length !== 1 ? 's' : ''} found`}
      actions={
        <Link
          href="/fleet/meter-hr-logs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + {t('nav.meterHrLogs')}
        </Link>
      }
      filters={
        <MeterHrLogFilters
          equipmentCode={params.equipment ?? ''}
          dateFrom={params.dateFrom ?? ''}
          dateTo={params.dateTo ?? ''}
        />
      }
    >
      <Suspense fallback={null}>
        <MeterHrLogListClient initialData={meterHrLogs} />
      </Suspense>
    </ListPage>
  )
}
