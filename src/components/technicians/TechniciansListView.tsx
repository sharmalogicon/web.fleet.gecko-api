'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { useT } from '@/i18n/I18nContext'
import { useTechnicians } from '@/lib/api/fleet/technicians'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'
import { TechnicianFilters } from './TechnicianFilters'
import { TechniciansListClient } from './TechniciansListClient'

interface Props {
  search: string
  trade: string
  status: string
  branch: string
}

const all = (v: string) => (v && v !== 'ALL' ? v : undefined)

export function TechniciansListView({ search, trade, status, branch }: Props) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useTechnicians({ search: search || undefined, trade: all(trade), status: all(status), branchId: all(branch) })
  const rows = list.data?.rows ?? []

  return (
    <ListPage
      title={t('nav.technicians')}
      subtitle={`${rows.length} technician${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.people.manage') && (
          <Link
            href="/master/technicians/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + {t('nav.technicians')}
          </Link>
        )
      }
      filters={<TechnicianFilters search={search} trade={trade} status={status} branch={branch} />}
    >
      {list.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <TechniciansListClient data={rows} />
      )}
    </ListPage>
  )
}
