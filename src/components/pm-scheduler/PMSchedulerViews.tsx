'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { useT } from '@/i18n/I18nContext'
import { NEW_PM_FORM, toFormValues, usePmProgram, usePmPrograms } from '@/lib/api/fleet/pm'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { PMScheduleListClient } from './PMScheduleListClient'
import { PMScheduleFormClient } from './PMScheduleFormClient'

const spinner = <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>

export function PMSchedulerListView({ search, category }: { search: string; category: string }) {
  const { t } = useT()
  const { canTenantWide } = useFleetAccess()
  const list = usePmPrograms({ search: search || undefined, category: category || undefined })
  const rows = list.data ?? []
  return (
    <ListPage
      title={t('nav.pmScheduler')}
      subtitle={`${rows.length} schedule${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canTenantWide('fleet.pm.manage') && (
          <Link href="/fleet/pm-scheduler/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + {t('nav.pmScheduler')}
          </Link>
        )
      }
    >
      {list.isLoading ? spinner : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <PMScheduleListClient data={rows} />
      )}
    </ListPage>
  )
}

export function PMScheduleView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const program = usePmProgram(isNew ? null : id)
  if (isNew) return <PMScheduleFormClient schedule={NEW_PM_FORM} isNew />
  if (program.isLoading) return spinner
  if (program.error instanceof ApiError && (program.error.status === 404 || program.error.status === 400)) notFound()
  if (program.error || !program.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(program.error, t)}</div>
  }
  return <PMScheduleFormClient key={program.data.rowVersion} schedule={toFormValues(program.data)} current={program.data} isNew={false} />
}
