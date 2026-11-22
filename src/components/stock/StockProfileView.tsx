'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { toViewModel, useItem, useStockSnapshot } from '@/lib/api/fleet/items'
import { useDefaultWarehouse } from '@/lib/api/fleet/warehouses'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { NEW_STOCK_DEFAULTS } from '@/types/stock'
import { StockProfileClient } from './StockProfileClient'

export function StockProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const item = useItem(isNew ? null : id)
  // Read-only snapshot (prompt 11 §A): on hand, costs, qty on order. Shown when it arrives (the form remounts).
  const snapshot = useStockSnapshot(isNew ? null : id)
  const { currentBranchId, isLoading: branchesLoading } = useBranchContext()
  // The reorder fields belong to the default store of the header's branch.
  const store = useDefaultWarehouse(currentBranchId)
  const spinner = <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>

  if (branchesLoading || (currentBranchId && store.isLoading)) return spinner
  const warehouse = store.data
  if (isNew) return <StockProfileClient key={warehouse?.warehouseId ?? 'none'} stock={NEW_STOCK_DEFAULTS} warehouse={warehouse} isNew />
  if (item.isLoading) return spinner
  if (item.error instanceof ApiError && (item.error.status === 404 || item.error.status === 400)) notFound()
  if (item.error || !item.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(item.error, t)}</div>
  }
  const view = { ...toViewModel(item.data, warehouse?.warehouseId), ...(snapshot.data ?? {}) }
  return <StockProfileClient key={`${item.data.rowVersion}:${warehouse?.warehouseId}:${snapshot.data ? 's' : ''}`} stock={view} current={view} warehouse={warehouse} isNew={false} />
}
