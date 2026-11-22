'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { ServiceTypeListClient } from '@/components/service-types/ServiceTypeListClient'
import { ServiceTypeFilters } from '@/components/service-types/ServiceTypeFilters'
import { useT } from '@/i18n/I18nContext'
import { useServiceTypes } from '@/lib/api/fleet/serviceTasks'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'

export function ServiceTypesListView({ search, category }: { search: string; category: string }) {
  const { t } = useT()
  const { canTenantWide } = useFleetAccess()
  const list = useServiceTypes({ search: search || undefined, category: category !== 'ALL' ? category : undefined })
  const rows = list.data ?? []
  return (
    <ListPage
      title={t('nav.serviceTypes')}
      subtitle={`${rows.length} service type${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canTenantWide('fleet.pm.manage') && (
          <Link
            href="/fleet/service-types/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + {t('nav.serviceTypes')}
          </Link>
        )
      }
      filters={<ServiceTypeFilters search={search} category={category} />}
    >
      {list.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : list.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
      ) : (
        <ServiceTypeListClient data={rows} />
      )}
    </ListPage>
  )
}
