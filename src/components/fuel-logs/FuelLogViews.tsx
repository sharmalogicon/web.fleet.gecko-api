'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { NEW_FUEL_FORM, toFormValues, useFuelLog, useFuelLogs } from '@/lib/api/fleet/fuelLogs'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { FuelLogFilters } from './FuelLogFilters'
import { FuelLogListClient } from './FuelLogListClient'
import { FuelLogApprovalClient } from './FuelLogApprovalClient'
import { FuelLogFormClient } from './FuelLogFormClient'

interface ListProps {
  equipmentCode: string
  dateFrom: string
  dateTo: string
  status: string
}

/** Fleet fuel logs only (Trucking-linked assets' fuel is shown on the form, read-only). */
export function FuelLogsListView({ equipmentCode, dateFrom, dateTo, status }: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useFuelLogs({
    search: equipmentCode || undefined, status: status && status !== 'ALL' ? status : undefined, from: dateFrom || undefined, to: dateTo || undefined,
  })
  const rows = list.data ?? []
  return (
    <ListPage
      title={t('nav.fuelLogs')}
      subtitle={`${rows.length} fuel log${rows.length !== 1 ? 's' : ''} found`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/fleet/fuel-logs/approval" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100">
            Approval Queue
          </Link>
          {canAnywhere('fleet.fuel.approve') && (
            <Link href="/fleet/fuel-logs/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              + {t('nav.fuelLogs')}
            </Link>
          )}
        </div>
      }
      filters={<FuelLogFilters equipmentCode={equipmentCode} dateFrom={dateFrom} dateTo={dateTo} status={status} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <FuelLogListClient data={rows} />}
    </ListPage>
  )
}

export function FuelLogApprovalView() {
  const { t } = useT()
  const list = useFuelLogs({ status: 'PENDING_APPROVAL' })
  const rows = list.data ?? []
  return (
    <ListPage
      title={t('nav.fuelApproval')}
      subtitle={`${rows.length} pending fuel log${rows.length !== 1 ? 's' : ''} awaiting approval`}
      actions={
        <Link href="/fleet/fuel-logs" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
          ← Back to Fuel Logs
        </Link>
      }
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <FuelLogApprovalClient data={rows} />}
    </ListPage>
  )
}

export function FuelLogView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const log = useFuelLog(isNew ? null : id)
  if (isNew) return <FuelLogFormClient record={NEW_FUEL_FORM} isNew />
  if (log.isLoading) return <Loading />
  if (log.error instanceof ApiError && (log.error.status === 404 || log.error.status === 400)) notFound()
  if (log.error || !log.data) return <Alert>{errorText(log.error, t)}</Alert>
  return <FuelLogFormClient key={log.data.rowVersion} record={toFormValues(log.data)} current={log.data} isNew={false} />
}
