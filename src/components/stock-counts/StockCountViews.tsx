'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { FormLayout } from '@/components/shared/FormLayout'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { Alert, Loading, StatusPill, cellInput, fmtDate, num, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { apiSend } from '@/lib/api/client'
import { useDoc, useDocList, useDocMutations } from '@/lib/api/fleet/documents'
import { useCodeList } from '@/lib/api/fleet/setup'
import { ITEM_CATEGORY_LIST, useItems } from '@/lib/api/fleet/items'
import { useWarehouse, useWarehouses } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type SC = components['schemas']['StockCountDto']
const col = createColumnHelper<SC>()
const BASE = '/fleet/stock-counts'
const SCOPES = ['FULL', 'CATEGORY', 'BIN', 'SELECTED'] as const
const STATUS_CLASS: Record<string, string> = { COUNTING: 'bg-amber-100 text-amber-700', POSTED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
const pill = (s: string) => <StatusPill view={s} className={STATUS_CLASS[s] ?? 'bg-gray-100 text-gray-700'} />

/** Counted − system; null while not counted. */
export function variance(systemQty: number | string, counted: string | number | null | undefined) {
  if (counted === null || counted === undefined || counted === '') return null
  return Math.round((Number(counted) - Number(systemQty)) * 10000) / 10000
}

/** New page (prompt 11 §H), the Goods Adjustments look. */
export function StockCountsListView({ search, status }: { search: string; status: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useDocList<SC>('stockCounts', { search: search || undefined, status: status === 'ALL' ? undefined : status })
  const stores = useWarehouses({ active: true })
  const storeName = (id: string) => stores.data?.find((w) => w.warehouseId === id)?.warehouseCode ?? '—'
  const open = (d: SC) => router.push(`${BASE}/${d.stockCountId}`)
  const rows = list.data ?? []
  const columns = [
    col.display({ id: 'no', header: () => t('common.docDate'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(d.documentDate)}</span></div> }),
    col.display({ id: 'store', header: () => t('docs.store'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{storeName(d.warehouseId)}</span><span className="text-xs text-gray-400">{d.scope}{d.scopeValue ? ` · ${d.scopeValue}` : ''}</span></div> }),
    col.display({ id: 'progress', header: () => t('docs.counted'), cell: ({ row: { original: d } }) => <span className="text-sm tabular-nums">{d.lines.filter((l) => l.countedQty !== null).length} / {d.lines.length}</span> }),
    col.display({ id: 'status', header: () => t('common.status'), cell: ({ row: { original: d } }) => pill(d.status) }),
    col.display({ id: 'actions', header: '', size: 60, cell: ({ row: { original: d } }) => <button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button> }),
  ]
  return (
    <ListPage
      title={t('nav.stockCounts')}
      subtitle={`${rows.length} found`}
      actions={canAnywhere('fleet.stock.adjust') && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.stockCounts')}</Link>}
      filters={
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
          <select value={status} onChange={(e) => router.push(`${BASE}?status=${e.target.value}`)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
            {['ALL', 'COUNTING', 'POSTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>)}
          </select>
        </div>
      }
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

export function StockCountView({ id }: { id: string }) {
  const doc = useDoc<SC>('stockCounts', id === 'new' ? null : id)
  if (id === 'new') return <NewCountForm />
  if (doc.isLoading) return <Loading />
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <CountSheet key={doc.data.rowVersion} current={doc.data} />
}

/** Create = the sheet at once (status COUNTING, system qty frozen now). */
function NewCountForm() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save } = useDocMutations<SC>('stockCounts')
  const { currentBranchId } = useBranchContext()
  const stores = useWarehouses({ branchId: currentBranchId, active: true }, !!currentBranchId)
  const categories = useCodeList(ITEM_CATEGORY_LIST)
  const items = useItems({ active: true })
  const [warehouseId, setWarehouseId] = useState('')
  const [scope, setScope] = useState<string>('FULL')
  const [scopeValue, setScopeValue] = useState('')
  const [codes, setCodes] = useState('')
  const [remarks, setRemarks] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const store = useWarehouse(warehouseId || null)

  const create = async () => {
    setBanner(null)
    if (!warehouseId) { setBanner(t('docs.rule.store')); return }
    const wanted = codes.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter(Boolean)
    const itemIds = wanted.map((c) => items.data?.find((x) => x.itemCode.toUpperCase() === c)?.itemId)
    if (scope === 'SELECTED' && (!wanted.length || itemIds.some((x) => !x))) { setBanner(t('docs.rule.itemCodes')); return }
    if ((scope === 'CATEGORY' || scope === 'BIN') && !scopeValue) { setBanner(t('docs.rule.scopeValue')); return }
    try {
      const saved = await save.mutateAsync({
        body: { warehouseId, scope, scopeValue: scope === 'CATEGORY' || scope === 'BIN' ? scopeValue : null, itemIds: scope === 'SELECTED' ? itemIds : null, remarks: remarks.trim() || null },
      })
      toast.success(t('docs.saved'), saved.documentNo)
      router.push(`${BASE}/${saved.stockCountId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${t('docs.store')} *`}>
        <select value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setScopeValue('') }} className={inputClass()}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </Field>
      <Field label={`${t('docs.scope')} *`}>
        <select value={scope} onChange={(e) => { setScope(e.target.value); setScopeValue('') }} className={inputClass()}>
          {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {scope === 'CATEGORY' && (
        <Field label={`${t('common.category')} *`}>
          <select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} className={inputClass()}>
            <option value="">—</option>
            {categories.data?.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.descriptionEn}</option>)}
          </select>
        </Field>
      )}
      {scope === 'BIN' && (
        <Field label={`${t('docs.bin')} *`}>
          <select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} disabled={!warehouseId} className={inputClass(false, !warehouseId)}>
            <option value="">—</option>
            {store.data?.bins.filter((b) => b.isActive).map((b) => <option key={b.binId} value={b.binCode}>{b.binCode}</option>)}
          </select>
        </Field>
      )}
      {scope === 'SELECTED' && (
        <div className="sm:col-span-2 lg:col-span-3"><Field label={`${t('docs.itemCodes')} *`} hint={t('docs.itemCodesHint')}><textarea value={codes} onChange={(e) => setCodes(e.target.value)} rows={2} className={`${inputClass()} font-mono resize-none`} /></Field></div>
      )}
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={`${inputClass()} resize-none`} /></Field></div>
    </div>
  )
  return (
    <FormLayout
      title={t('common.new')}
      subtitle={t('nav.stockCounts')}
      tabs={[{ id: 'header', label: t('form.header'), content }]}
      isNew
      actions={<div className="flex gap-2"><ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton><ToolbarButton tone="primary" disabled={save.isPending} onClick={create}>{t('docs.action.startCount')}</ToolbarButton></div>}
    />
  )
}

function CountSheet({ current }: { current: SC }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const client = useQueryClient()
  const { action } = useDocMutations<SC>('stockCounts')
  const { canAt } = useFleetAccess()
  const items = useItems({ active: true })
  const store = useWarehouse(current.warehouseId)
  const [counts, setCounts] = useState<Record<string, { qty: string; remarks: string }>>(
    Object.fromEntries(current.lines.map((l) => [l.stockCountLineId, { qty: l.countedQty === null ? '' : String(num(l.countedQty)), remarks: l.remarks ?? '' }])))
  const [banner, setBanner] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const record = useMutation({
    mutationFn: (body: unknown) => apiSend<SC>('PUT', `/api/fleet/stock-counts/${current.stockCountId}/counts`, body),
    onSettled: () => client.invalidateQueries({ queryKey: ['fleet', 'docs'] }),
  })
  const manage = canAt('fleet.stock.adjust', current.branchId)
  const counting = current.status === 'COUNTING' && manage
  const acts = useDocActions(action, current.stockCountId, current.rowVersion)
  const busy = record.isPending || action.isPending
  const binCode = (id: string | null) => (id ? store.data?.bins.find((b) => b.binId === id)?.binCode ?? id.slice(0, 8) : '—')
  const itemOf = (id: string) => items.data?.find((x) => x.itemId === id)
  const changed = current.lines.filter((l) => {
    const c = counts[l.stockCountLineId]
    return c.qty !== '' && (l.countedQty === null || num(l.countedQty) !== num(c.qty) || (l.remarks ?? '') !== c.remarks)
  })
  const allCounted = current.lines.every((l) => counts[l.stockCountLineId].qty !== '')
  const rows = current.lines.filter((l) => !filter || l.itemCode.toUpperCase().includes(filter.toUpperCase()) || binCode(l.binId).toUpperCase().includes(filter.toUpperCase()))

  const saveCounts = async () => {
    setBanner(null)
    if (!changed.length) return current
    try {
      const saved = await record.mutateAsync({
        lines: changed.map((l) => ({ stockCountLineId: l.stockCountLineId, countedQty: num(counts[l.stockCountLineId].qty), remarks: counts[l.stockCountLineId].remarks.trim() || null })),
        rowVersion: current.rowVersion,
      })
      toast.success(t('docs.saved'), saved.documentNo)
      return saved
    } catch (e) {
      setBanner(failure(e))
      return null
    }
  }
  const post = async () => {
    if (!allCounted) { setBanner(t('docs.rule.allCounted')); return }
    const saved = changed.length ? await saveCounts() : current
    if (!saved) return
    action.mutate({ id: saved.stockCountId, action: 'post', body: { reason: null, rowVersion: saved.rowVersion } }, {
      onSuccess: () => toast.success(t('docs.done')),
      onError: (e) => setBanner(failure(e)),
    })
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={t('form.documentNo')}><input readOnly value={current.documentNo} className={inputClass(false, true)} /></Field>
      <Field label={t('common.docDate')}><input readOnly value={fmtDate(current.documentDate)} className={inputClass(false, true)} /></Field>
      <Field label={t('docs.store')}><input readOnly value={store.data ? `${store.data.warehouseCode} · ${store.data.nameEn}` : ''} className={inputClass(false, true)} /></Field>
      <Field label={t('docs.scope')}><input readOnly value={`${current.scope}${current.scopeValue ? ` · ${current.scopeValue}` : ''}`} className={inputClass(false, true)} /></Field>
      <Field label={t('common.status')}><div className="pt-1">{pill(current.status)}</div></Field>
      <Field label={t('nav.goodsAdjustments')}>
        {current.stockAdjustmentId ? <Link href={`/fleet/goods-adjustments/${current.stockAdjustmentId}`} className="text-sm text-blue-600 hover:underline pt-2">{t('docs.openAdjustment')}</Link> : <input readOnly value="—" className={inputClass(false, true)} />}
      </Field>
      {current.remarks && <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea readOnly value={current.remarks} rows={2} className={`${inputClass(false, true)} resize-none`} /></Field></div>}
    </div>
  )

  const sheet = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('docs.filterSheet')} className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-64" />
        <span className="text-xs text-gray-500">{current.lines.filter((l) => counts[l.stockCountLineId].qty !== '').length} / {current.lines.length} {t('docs.counted')}</span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left"><th className="px-3 py-2">Stock Code</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">{t('docs.bin')}</th><th className="px-3 py-2 text-right">{t('docs.systemQty')}</th><th className="px-3 py-2 w-28">{t('docs.countedQty')}</th><th className="px-3 py-2 text-right">{t('docs.variance')}</th><th className="px-3 py-2">Remarks</th></tr></thead>
          <tbody>
            {rows.map((l, i) => {
              const c = counts[l.stockCountLineId]
              const v = counting ? variance(l.systemQty, c.qty) : l.varianceQty === null ? null : num(l.varianceQty)
              return (
                <tr key={l.stockCountLineId} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-mono">{l.itemCode}</td>
                  <td className="px-3 py-1.5">{itemOf(l.itemId)?.descriptionEn ?? ''}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{binCode(l.binId)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(l.systemQty)}</td>
                  <td className="px-3 py-1.5"><input type="number" step="any" min={0} value={c.qty} disabled={!counting} aria-label={`Counted ${i + 1}`} className={cellInput} onChange={(e) => setCounts((s) => ({ ...s, [l.stockCountLineId]: { ...c, qty: e.target.value } }))} /></td>
                  <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${v === null || v === 0 ? 'text-gray-500' : v < 0 ? 'text-red-600' : 'text-green-600'}`}>{v === null ? '—' : v > 0 ? `+${v}` : v}</td>
                  <td className="px-3 py-1.5"><input value={c.remarks} disabled={!counting} aria-label={`Remarks ${i + 1}`} className={cellInput} onChange={(e) => setCounts((s) => ({ ...s, [l.stockCountLineId]: { ...c, remarks: e.target.value } }))} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <>
      <FormLayout
        title={current.documentNo}
        subtitle={t('nav.stockCounts')}
        tabs={[{ id: 'sheet', label: `${t('docs.sheet')} (${current.lines.length})`, content: sheet }, { id: 'header', label: t('form.header'), content: header }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {counting && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('cancel', `${t('docs.action.cancel')} · ${current.documentNo}`)}>{t('docs.action.cancel')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {counting && <ToolbarButton tone="success" disabled={busy || !allCounted} onClick={post}>{t('docs.action.post')}</ToolbarButton>}
            {counting && <ToolbarButton tone="primary" disabled={busy || !changed.length} onClick={saveCounts}>{record.isPending ? t('common.loading') : t('docs.action.saveCounts')}</ToolbarButton>}
          </div>
        }
      />
      {acts.dialogNode}
    </>
  )
}
