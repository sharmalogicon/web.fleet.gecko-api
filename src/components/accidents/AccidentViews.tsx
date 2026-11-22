'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Alert, Loading } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import { NEW_ACCIDENT_FORM, toFormValues, toRow, useAccident, useAccidents } from '@/lib/api/fleet/accidents'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { AccidentFilters } from './AccidentFilters'
import { AccidentListClient } from './AccidentListClient'
import { AccidentFormClient } from './AccidentFormClient'

interface ListProps {
  equipmentCode: string
  driverName: string
  accidentType: string
  status: string
  dateFrom: string
  dateTo: string
}

export function AccidentsListView(p: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  // The API has one `search` (document no, asset, driver): equipment first, else driver.
  const list = useAccidents({
    search: p.equipmentCode || p.driverName || undefined, accidentType: p.accidentType || undefined,
    status: p.status || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toRow)
  return (
    <ListPage
      title={t('nav.accidents')}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.incident.manage') && (
        <Link href="/fleet/accidents/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + {t('nav.accidents')}
        </Link>
      )}
      filters={<AccidentFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <AccidentListClient data={rows} />}
    </ListPage>
  )
}

export function AccidentView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const acc = useAccident(isNew ? null : id)
  if (isNew) return <AccidentFormClient record={NEW_ACCIDENT_FORM} isNew />
  if (acc.isLoading) return <Loading />
  if (acc.error instanceof ApiError && (acc.error.status === 404 || acc.error.status === 400)) notFound()
  if (acc.error || !acc.data) return <Alert>{errorText(acc.error, t)}</Alert>
  return <AccidentFormClient key={acc.data.rowVersion} record={toFormValues(acc.data)} current={acc.data} isNew={false} />
}
