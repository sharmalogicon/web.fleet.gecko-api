'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { useT } from '@/i18n/I18nContext'
import { useMeterReadings, type MeterKind, type MeterReadingView } from '@/lib/api/fleet/meters'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'

interface Props {
  title: string
  noun: string
  newHref: string
  kind: MeterKind
  search: string
  from: string
  to: string
  filters: ReactNode
  children: (rows: MeterReadingView[]) => ReactNode
}

/** List shell shared by Meter Logs (KM) and Meter HR Logs (HOUR): same ListPage, rows from GET /meter-readings. */
export function MeterReadingsListView({ title, noun, newHref, kind, search, from, to, filters, children }: Props) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  // `to` is a date: include the whole day.
  const list = useMeterReadings({ kind, search: search || undefined, from: from || undefined, to: to ? `${to}T23:59:59` : undefined })
  const rows = list.data ?? []
  return (
    <ListPage
      title={title}
      subtitle={`${rows.length} ${noun}${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.meter.record') && (
          <Link href={newHref} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + {title}
          </Link>
        )
      }
      filters={filters}
    >
      {list.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        children(rows)
      )}
    </ListPage>
  )
}
