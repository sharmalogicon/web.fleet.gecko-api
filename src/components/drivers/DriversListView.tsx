'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DriversListClient } from '@/components/drivers/DriversListClient'
import { DriverFilters } from '@/components/drivers/DriverFilters'
import { useT } from '@/i18n/I18nContext'
import { apiStatusFilter, useDrivers, useSyncDrivers } from '@/lib/api/fleet/drivers'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

interface Props {
  name: string
  status: string
  branch: string
}

export function DriversListView({ name, status, branch }: Props) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAnywhere, canTenantWide } = useFleetAccess()
  const drivers = useDrivers({ search: name || undefined, status: apiStatusFilter(status), branchId: branch !== 'ALL' ? branch : undefined })
  const sync = useSyncDrivers()

  // The API has INACTIVE only; TERMINATED vs INACTIVE is decided by the leaving date (adapter).
  const rows = useMemo(() => {
    const list = drivers.data ?? []
    return status === 'TERMINATED' || status === 'INACTIVE' ? list.filter((d) => d.status === status) : list
  }, [drivers.data, status])

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          t('driver.syncDone'),
          t('equipment.syncDoneBody')
            .replace('{created}', String(r.created))
            .replace('{updated}', String(r.updated))
            .replace('{unchanged}', String(r.unchanged))
            .replace('{deactivated}', String(r.deactivated)),
        ),
      onError: (e) => toast.error(t('equipment.syncFailed'), errorText(e, t)),
    })

  return (
    <ListPage
      title={t('nav.drivers')}
      subtitle={`${rows.length} driver${rows.length !== 1 ? 's' : ''} found`}
      actions={
        <>
          {canTenantWide('fleet.people.manage') && (
            <button
              type="button"
              onClick={runSync}
              disabled={sync.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('equipment.syncFromTrucking')}
            </button>
          )}
          {canAnywhere('fleet.people.manage') && (
            <Link
              href="/master/drivers/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + {t('nav.drivers')}
            </Link>
          )}
        </>
      }
      filters={<DriverFilters name={name} status={status} branch={branch} />}
    >
      {drivers.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : drivers.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(drivers.error, t)}</div>
      ) : (
        <DriversListClient data={rows} />
      )}
    </ListPage>
  )
}
