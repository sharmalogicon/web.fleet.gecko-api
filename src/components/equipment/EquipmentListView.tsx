'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { EquipmentListClient } from '@/components/equipment/EquipmentListClient'
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters'
import { useT } from '@/i18n/I18nContext'
import { useAssets, useSyncAssets } from '@/lib/api/fleet/assets'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

interface Props {
  code: string
  status: string
  category: string
}

/** API statuses; UNDER REPAIR comes from Trucking (`sourceStatus`) and is filtered on the loaded rows. */
const API_STATUSES = ['ACTIVE', 'INACTIVE', 'DISPOSED']

export function EquipmentListView({ code, status, category }: Props) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAnywhere, canTenantWide } = useFleetAccess()
  const assets = useAssets({ search: code || undefined, status: API_STATUSES.includes(status) ? status : undefined })
  const sync = useSyncAssets()

  const rows = useMemo(() => {
    let list = assets.data?.rows ?? []
    if (status === 'UNDER REPAIR') list = list.filter((r) => r.status === 'UNDER REPAIR')
    // The API has no category filter (FLEET_ASSET_CATEGORY is the tenant's own list): filter the loaded page.
    if (category && category !== 'ALL') list = list.filter((r) => (r.category ?? '').toUpperCase() === category.toUpperCase())
    return list
  }, [assets.data, status, category])

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          t('equipment.syncDone'),
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
      title={t('nav.equipment')}
      subtitle={`${rows.length} unit${rows.length !== 1 ? 's' : ''} found${assets.data?.hasMore ? ` ${t('equipment.firstPage')}` : ''}`}
      actions={
        <>
          {canTenantWide('fleet.asset.manage') && (
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
          {canAnywhere('fleet.asset.manage') && (
            <Link
              href="/master/equipment/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + {t('nav.equipment')}
            </Link>
          )}
        </>
      }
      filters={<EquipmentFilters code={code} status={status} category={category} />}
    >
      {assets.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : assets.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {errorText(assets.error, t)}
        </div>
      ) : (
        <EquipmentListClient data={rows} />
      )}
    </ListPage>
  )
}
