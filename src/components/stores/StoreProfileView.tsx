'use client'

import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useT } from '@/i18n/I18nContext'
import { NEW_STORE_DEFAULTS, toFormValues, useWarehouse } from '@/lib/api/fleet/warehouses'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { StoreFormClient } from './StoreFormClient'

export function StoreProfileView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const store = useWarehouse(isNew ? null : id)
  const { currentBranchId, isLoading: branchesLoading } = useBranchContext()
  const spinner = <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>

  if (isNew) {
    if (branchesLoading) return spinner
    return <StoreFormClient key={currentBranchId ?? 'none'} values={{ ...NEW_STORE_DEFAULTS, branchId: currentBranchId ?? '' }} isNew />
  }
  if (store.isLoading) return spinner
  if (store.error instanceof ApiError && (store.error.status === 404 || store.error.status === 400)) notFound()
  if (store.error || !store.data) {
    return <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(store.error, t)}</div>
  }
  const binsVersion = store.data.bins.map((b) => b.rowVersion).join('|')
  return <StoreFormClient key={`${store.data.rowVersion}:${binsVersion}`} values={toFormValues(store.data)} current={store.data} isNew={false} />
}
