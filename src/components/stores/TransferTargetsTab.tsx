'use client'

import { useState } from 'react'
import { Alert, Loading } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  targetsState, toTargetsRequest, useSaveTransferTargets, useTransferTargets, useWarehouses, type TargetsMode, type WarehouseDto,
} from '@/lib/api/fleet/warehouses'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

/**
 * Stores form → "Transfer targets" (owner-approved 2026-11-22, backend #12): which stores this store may send stock to.
 * ANY = no list (every active store); LIST = only the ticked stores (a transfer elsewhere → 400 on toWarehouseId).
 */
export function TransferTargetsTab({ store, canManage }: { store: WarehouseDto; canManage: boolean }) {
  const { t } = useT()
  const all = useWarehouses({ active: true })
  const targets = useTransferTargets(store.warehouseId)
  if (all.isLoading || targets.isLoading) return <Loading />
  if (all.error || targets.error) return <Alert>{errorText(all.error ?? targets.error, t)}</Alert>
  const others = (all.data ?? []).filter((w) => w.warehouseId !== store.warehouseId)
  const start = targetsState(targets.data ?? [], others)
  return <TargetsEditor key={`${start.mode}:${start.ids.join(',')}`} store={store} others={others} start={start} canManage={canManage} />
}

function TargetsEditor({ store, others, start, canManage }: {
  store: WarehouseDto
  others: WarehouseDto[]
  start: { mode: TargetsMode; ids: string[] }
  canManage: boolean
}) {
  const { t } = useT()
  const toast = useToastStore()
  const save = useSaveTransferTargets(store.warehouseId)
  const [mode, setMode] = useState<TargetsMode>(start.mode)
  const [ids, setIds] = useState<Set<string>>(new Set(start.ids))
  const [error, setError] = useState<string | null>(null)
  const dirty = mode !== start.mode || (mode === 'LIST' && (ids.size !== start.ids.length || start.ids.some((id) => !ids.has(id))))
  const toggle = (id: string) => setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const submit = () => {
    const { body, error: rule } = toTargetsRequest(mode, [...ids])
    if (!body) { setError(t(rule!)); return }
    setError(null)
    save.mutate(body, {
      onSuccess: () => toast.success(t('store.targets.saved'), store.warehouseCode),
      onError: (e) => setError(errorText(e, t)),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">{t('store.targets.hint')}</p>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="targets-mode" checked={mode === 'ANY'} disabled={!canManage} onChange={() => setMode('ANY')} />
          {t('store.targets.any')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="targets-mode" checked={mode === 'LIST'} disabled={!canManage} onChange={() => setMode('LIST')} />
          {t('store.targets.list')}
        </label>
      </div>
      {mode === 'LIST' && (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
          {others.length === 0 && <p className="p-3 text-sm text-gray-400">{t('store.targets.noOthers')}</p>}
          {others.map((w) => (
            <label key={w.warehouseId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <input type="checkbox" checked={ids.has(w.warehouseId)} disabled={!canManage} onChange={() => toggle(w.warehouseId)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="font-mono">{w.warehouseCode}</span>
              <span className="text-gray-600">{w.nameEn}</span>
              {w.branchId !== store.branchId && <span className="text-[10px] px-1.5 rounded bg-gray-100 text-gray-500">{t('store.targets.otherBranch')}</span>}
            </label>
          ))}
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      {canManage && (
        <div>
          <button type="button" onClick={submit} disabled={save.isPending || !dirty}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {save.isPending ? t('common.loading') : t('store.targets.save')}
          </button>
        </div>
      )}
    </div>
  )
}
