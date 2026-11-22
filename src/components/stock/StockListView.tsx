'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { StockListClient } from '@/components/stock/StockListClient'
import { StockFilters } from '@/components/stock/StockFilters'
import { useT } from '@/i18n/I18nContext'
import { toViewModel, useItems } from '@/lib/api/fleet/items'
import { useDefaultWarehouse } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'

interface Props {
  search: string
  status: string
  category: string
}

export function StockListView({ search, status, category }: Props) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  // Min / max in the list = the policy of the header branch's default store.
  const store = useDefaultWarehouse(currentBranchId)
  const items = useItems({
    search: search || undefined,
    category: category !== 'ALL' ? category : undefined,
    active: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
  })
  const rows = useMemo(() => (items.data ?? []).map((d) => toViewModel(d, store.data?.warehouseId)), [items.data, store.data])

  return (
    <ListPage
      title={t('nav.stock')}
      subtitle={`${rows.length} item${rows.length !== 1 ? 's' : ''} found`}
      actions={
        canAnywhere('fleet.inventory.manage') && (
          <Link
            href="/master/stock/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + {t('nav.stock')}
          </Link>
        )
      }
      filters={<StockFilters search={search} status={status} category={category} />}
    >
      {items.isLoading ? (
        <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : items.error ? (
        <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(items.error, t)}</div>
      ) : (
        <StockListClient data={rows} />
      )}
    </ListPage>
  )
}
