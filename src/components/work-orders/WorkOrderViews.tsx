'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { useT } from '@/i18n/I18nContext'
import { NEW_WO_FORM, toFormValues, useWorkOrder, useWorkOrders } from '@/lib/api/fleet/workOrders'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { WorkOrderFilters } from './WorkOrderFilters'
import { WorkOrderListClient } from './WorkOrderListClient'
import { WorkOrderFormClient } from './WorkOrderFormClient'

const spinner = <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>

interface ListProps {
  documentNo: string
  status: string
  serviceTypeCategory: string
  dateFrom: string
  dateTo: string
}

export function WorkOrdersListView({ documentNo, status, serviceTypeCategory, dateFrom, dateTo }: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useWorkOrders({ search: documentNo || undefined, status, from: dateFrom || undefined, to: dateTo || undefined })
  // The API has no type filter: filter the loaded rows.
  const rows = useMemo(
    () => (list.data ?? []).filter((w) => serviceTypeCategory === 'ALL' || !serviceTypeCategory || w.woType === serviceTypeCategory),
    [list.data, serviceTypeCategory],
  )
  return (
    <ListPage
      title={t('nav.workOrders')}
      subtitle={`${rows.length} work order${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.workorder.manage') && (
          <Link href="/fleet/work-orders/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + {t('nav.workOrders')}
          </Link>
        )
      }
      filters={<WorkOrderFilters documentNo={documentNo} status={status} serviceTypeCategory={serviceTypeCategory} dateFrom={dateFrom} dateTo={dateTo} />}
    >
      {list.isLoading ? spinner : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <WorkOrderListClient data={rows} />
      )}
    </ListPage>
  )
}

export function WorkOrderView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const wo = useWorkOrder(isNew ? null : id)
  if (isNew) return <WorkOrderFormClient workOrder={NEW_WO_FORM} isNew />
  if (wo.isLoading) return spinner
  if (wo.error instanceof ApiError && (wo.error.status === 404 || wo.error.status === 400)) notFound()
  if (wo.error || !wo.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(wo.error, t)}</div>
  }
  return <WorkOrderFormClient key={wo.data.rowVersion} workOrder={toFormValues(wo.data)} current={wo.data} isNew={false} />
}
