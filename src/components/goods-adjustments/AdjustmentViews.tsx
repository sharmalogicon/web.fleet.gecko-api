'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { AdjustmentFilters } from '@/components/goods-adjustments/AdjustmentFilters'
import { Alert, Loading, StatusPill, cellInput, fmtDate, money, num, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { signedQty, useDoc, useDocList, useDocMutations } from '@/lib/api/fleet/documents'
import { useItems } from '@/lib/api/fleet/items'
import { useTransferTargets, useWarehouse, useWarehouses } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { ADJUSTMENT_TYPE_MAP } from '@/types/goods-adjustment'

type ADJ = components['schemas']['StockAdjustmentDto']
type TRF = components['schemas']['StockTransferDto']
const BASE = '/fleet/goods-adjustments'
export const ADJUST_REASONS = ['DAMAGE', 'EXPIRED', 'LOST', 'FOUND', 'OTHER'] as const
const TYPES = ['INCREASE', 'DECREASE', 'WRITE_OFF', 'TRANSFER'] as const
const TYPE_LABEL: Record<string, string> = { ...ADJUSTMENT_TYPE_MAP, COUNT: 'Stock Count' }
const TYPE_CLASS: Record<string, string> = {
  INCREASE: 'bg-green-100 text-green-700', DECREASE: 'bg-orange-100 text-orange-700', TRANSFER: 'bg-blue-100 text-blue-700',
  WRITE_OFF: 'bg-red-100 text-red-700', COUNT: 'bg-purple-100 text-purple-700',
}
const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700', PENDING_APPROVAL: 'bg-amber-100 text-amber-700', POSTED: 'bg-green-100 text-green-700', IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  RECEIVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-red-100 text-red-700',
}
const pill = (s: string) => <StatusPill view={s} className={STATUS_CLASS[s] ?? 'bg-gray-100 text-gray-700'} />

/** One list row: an adjustment or a transfer (prompt 11 §F/G: the list merges both). */
export interface AdjRow { kind: 'adj' | 'trf'; id: string; documentNo: string; documentDate: string; type: string; status: string; remarks: string | null; amount: number }
export function mergeAdjustmentRows(adjs: ADJ[], trfs: TRF[]): AdjRow[] {
  return [
    ...adjs.map((a): AdjRow => ({ kind: 'adj', id: a.stockAdjustmentId, documentNo: a.documentNo, documentDate: a.documentDate, type: a.adjustmentType, status: a.status, remarks: a.remarks, amount: num(a.totalAmount) })),
    ...trfs.map((x): AdjRow => ({ kind: 'trf', id: x.stockTransferId, documentNo: x.documentNo, documentDate: x.documentDate, type: 'TRANSFER', status: x.status, remarks: x.remarks, amount: num(x.totalCost) })),
  ].sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.documentNo.localeCompare(a.documentNo))
}
const href = (r: { kind: 'adj' | 'trf'; id: string }) => `${BASE}/${r.id}${r.kind === 'trf' ? '?kind=transfer' : ''}`
const col = createColumnHelper<AdjRow>()

export function AdjustmentsListView(p: { documentNo: string; adjustmentType: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const c = { search: p.documentNo || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined }
  const wantAdj = p.adjustmentType !== 'TRANSFER'
  const wantTrf = p.adjustmentType === 'ALL' || p.adjustmentType === 'TRANSFER'
  const adjs = useDocList<ADJ>('stockAdjustments', { ...c, adjustmentType: wantAdj && p.adjustmentType !== 'ALL' ? p.adjustmentType : undefined }, wantAdj)
  const trfs = useDocList<TRF>('stockTransfers', c, wantTrf)
  const rows = mergeAdjustmentRows(wantAdj ? adjs.data ?? [] : [], wantTrf ? trfs.data ?? [] : []).filter((r) => p.adjustmentType === 'ALL' || r.type === p.adjustmentType)
  const loading = (wantAdj && adjs.isLoading) || (wantTrf && trfs.isLoading)
  const error = (wantAdj && adjs.error) || (wantTrf && trfs.error)
  const columns = [
    col.display({ id: 'no', header: () => t('common.docDate'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => router.push(href(r))} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{r.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(r.documentDate)}</span></div> }),
    col.display({ id: 'type', header: () => t('common.type'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-1 items-start"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_CLASS[r.type] ?? 'bg-gray-100 text-gray-700'}`}>{TYPE_LABEL[r.type] ?? r.type}</span>{pill(r.status)}</div> }),
    col.display({ id: 'remarks', header: () => t('common.remarks'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5"><span className="text-sm text-gray-700">{r.remarks || '—'}</span><span className="text-xs text-gray-400">{money(r.amount)}</span></div> }),
    col.display({ id: 'actions', header: '', size: 60, cell: ({ row: { original: r } }) => <button type="button" onClick={() => router.push(href(r))} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button> }),
  ]
  return (
    <ListPage
      title={t('nav.goodsAdjustments')}
      subtitle={`${rows.length} adjustment${rows.length !== 1 ? 's' : ''} found`}
      actions={(canAnywhere('fleet.stock.adjust') || canAnywhere('fleet.stock.issue')) && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.goodsAdjustments')}</Link>}
      filters={<AdjustmentFilters documentNo={p.documentNo} adjustmentType={p.adjustmentType} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {loading ? <Loading /> : error ? <div className="m-4"><Alert>{errorText(error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

interface Line { key: string; itemId: string; code: string; description: string; uom: string; binId: string; toBinId: string; stockLotId: string | null; qty: string; price: string; amount: number | null; receivedQty: number | null; transferLineId?: string }

export function AdjustmentView({ id, kind }: { id: string; kind?: string }) {
  const isTrf = kind === 'transfer'
  const adj = useDoc<ADJ>('stockAdjustments', id !== 'new' && !isTrf ? id : null)
  const trf = useDoc<TRF>('stockTransfers', id !== 'new' && isTrf ? id : null)
  if (id === 'new') return <AdjustmentForm />
  const q = isTrf ? trf : adj
  if (q.isLoading) return <Loading />
  if (!q.data) return <p className="text-sm text-red-600">Not found.</p>
  return isTrf ? <AdjustmentForm key={trf.data!.rowVersion} transfer={trf.data} /> : <AdjustmentForm key={adj.data!.rowVersion} adjustment={adj.data} />
}

function AdjustmentForm({ adjustment, transfer }: { adjustment?: ADJ; transfer?: TRF }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const adjM = useDocMutations<ADJ>('stockAdjustments')
  const trfM = useDocMutations<TRF>('stockTransfers')
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const current = adjustment ?? transfer
  const branchId = current?.branchId ?? currentBranchId ?? ''
  const items = useItems({ active: true })
  const stores = useWarehouses({ branchId, active: true }, !!branchId)
  const allStores = useWarehouses({ active: true })
  const [type, setType] = useState<string>(transfer ? 'TRANSFER' : adjustment?.adjustmentType ?? 'INCREASE')
  const [warehouseId, setWarehouseId] = useState(adjustment?.warehouseId ?? transfer?.fromWarehouseId ?? '')
  const [toWarehouseId, setToWarehouseId] = useState(transfer?.toWarehouseId ?? '')
  const [reasonCode, setReasonCode] = useState(adjustment?.reasonCode ?? '')
  const [remarks, setRemarks] = useState(current?.remarks ?? '')
  const itemOf = (id: string) => items.data?.find((x) => x.itemId === id)
  const [lines, setLines] = useState<Line[]>(
    adjustment ? adjustment.lines.map((l) => ({
      key: l.stockAdjustmentLineId, itemId: l.itemId, code: l.itemCode, description: '', uom: '', binId: l.binId ?? '', toBinId: '', stockLotId: l.stockLotId,
      qty: String(Math.abs(num(l.qtyChange))), price: l.unitCost === null ? '' : String(num(l.unitCost)), amount: num(l.amount), receivedQty: null,
    }))
    : transfer ? transfer.lines.map((l) => ({
      key: l.stockTransferLineId, itemId: l.itemId, code: l.itemCode, description: '', uom: '', binId: l.binId ?? '', toBinId: l.toBinId ?? '', stockLotId: l.stockLotId,
      qty: String(num(l.qty)), price: String(num(l.unitCost)), amount: num(l.qty) * num(l.unitCost), receivedQty: l.receivedQty === null ? null : num(l.receivedQty), transferLineId: l.stockTransferLineId,
    }))
    : [])
  const [banner, setBanner] = useState<string | null>(null)
  const fromStore = useWarehouse(warehouseId || null)
  const targets = useTransferTargets(warehouseId || null)
  const toStore = useWarehouse(toWarehouseId || null)

  const isTrf = type === 'TRANSFER'
  const status = current?.status ?? 'NEW'
  const draft = status === 'NEW' || status === 'DRAFT'
  const perm = isTrf ? 'fleet.stock.issue' : 'fleet.stock.adjust'
  const manage = current ? canAt(perm, branchId) : canAnywhere(perm)
  const editable = draft && manage && type !== 'COUNT'
  const toBranchId = transfer?.toBranchId ?? allStores.data?.find((w) => w.warehouseId === toWarehouseId)?.branchId ?? ''
  const can = {
    approve: !!adjustment && status === 'PENDING_APPROVAL' && adjustment.approvalStatus === 'PENDING' && canAt('fleet.stock.approve', branchId), // owner 2026-11-20: approval = fleet.stock.approve (as the API checks)
    cancel: !!current && manage && (isTrf ? ['DRAFT', 'IN_TRANSIT'].includes(status) : ['DRAFT', 'PENDING_APPROVAL', 'POSTED'].includes(status)),
    receive: !!transfer && status === 'IN_TRANSIT' && canAt('fleet.inventory.manage', toBranchId),
  }
  const m = isTrf ? trfM : adjM
  const acts = useDocActions(m.action, adjustment?.stockAdjustmentId ?? transfer?.stockTransferId, current?.rowVersion)
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const busy = m.save.isPending || m.action.isPending
  const lineAmount = (l: Line) => (l.amount !== null && !editable ? l.amount : num(l.qty) * num(l.price))
  const total = adjustment && !editable ? num(adjustment.totalAmount) : transfer && !editable ? num(transfer.totalCost) : lines.reduce((s, l) => s + lineAmount(l), 0)

  const persist = async (act: boolean) => {
    setBanner(null)
    if (!warehouseId) { setBanner(t('docs.rule.store')); return }
    if (isTrf && (!toWarehouseId || toWarehouseId === warehouseId)) { setBanner(t('docs.rule.toStore')); return }
    if (!lines.length || lines.some((l) => !l.itemId)) { setBanner(t('docs.rule.itemLines')); return }
    if (lines.some((l) => num(l.qty) <= 0)) { setBanner(t('docs.rule.positiveQty')); return }
    const rowVersion = current?.rowVersion ?? null
    try {
      if (isTrf) {
        const body = {
          fromWarehouseId: warehouseId, toWarehouseId, remarks: remarks.trim() || null, ship: act && !transfer, rowVersion,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: num(l.qty), binId: l.binId || null, stockLotId: l.stockLotId, toBinId: l.toBinId || null })),
        }
        let saved = await trfM.save.mutateAsync({ id: transfer?.stockTransferId, body })
        if (act && transfer) saved = await trfM.action.mutateAsync({ id: saved.stockTransferId, action: 'ship', body: { reason: null, rowVersion: saved.rowVersion } })
        toast.success(t('docs.saved'), saved.documentNo)
        if (!transfer) router.push(href({ kind: 'trf', id: saved.stockTransferId }))
      } else {
        const body = {
          warehouseId, adjustmentType: type, reasonCode: reasonCode || null, remarks: remarks.trim() || null, submit: act && !adjustment, rowVersion,
          lines: lines.map((l) => ({
            itemId: l.itemId, qtyChange: signedQty(type, num(l.qty)), binId: l.binId || null, stockLotId: l.stockLotId,
            unitCost: type === 'INCREASE' && l.price !== '' ? num(l.price) : null, remarks: null,
          })),
        }
        let saved = await adjM.save.mutateAsync({ id: adjustment?.stockAdjustmentId, body })
        if (act && adjustment) saved = await adjM.action.mutateAsync({ id: saved.stockAdjustmentId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
        toast.success(t('docs.saved'), saved.documentNo)
        if (!adjustment) router.push(href({ kind: 'adj', id: saved.stockAdjustmentId }))
      }
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${t('form.documentNo')} *`}><input readOnly value={current?.documentNo ?? ''} placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.adjustmentDate')} *`}><input type="date" readOnly value={current?.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.adjustmentType')} *`}>
        <select value={type} onChange={(e) => setType(e.target.value)} disabled={!!current || !draft} className={inputClass(false, !!current)}>
          {(type === 'COUNT' ? ['COUNT'] : TYPES).map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </Field>
      <Field label={t('form.typeDescription')}><input readOnly value={TYPE_LABEL[type] ?? type} className={inputClass(false, true)} /></Field>
      <Field label={`${isTrf ? t('docs.fromStore') : t('docs.store')} *`}>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!editable || lines.length > 0} className={inputClass(false, !editable || lines.length > 0)}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </Field>
      {isTrf ? (
        <Field label={`${t('docs.toStore')} *`}>
          <select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} disabled={!editable} className={inputClass(false, !editable)}>
            <option value="">—</option>
            {(targets.data ?? allStores.data)?.filter((w) => w.warehouseId !== warehouseId).map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
          </select>
        </Field>
      ) : (
        <Field label={t('docs.reason')}>
          <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} disabled={!editable} className={inputClass(false, !editable)}>
            <option value="">—</option>
            {ADJUST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('common.status')}><div className="pt-1">{current ? pill(current.status) : <span className="text-sm text-gray-500">—</span>}</div></Field>
      <Field label={t('form.amount')}><input readOnly value={money(total)} className={inputClass(false, true)} /></Field>
      {adjustment?.stockCountId && <Field label={t('nav.stockCounts')}><Link href={`/fleet/stock-counts/${adjustment.stockCountId}`} className="text-sm text-blue-600 hover:underline pt-2">{t('docs.openCount')}</Link></Field>}
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!editable} rows={3} className={`${inputClass(false, !editable)} resize-none`} /></Field></div>
    </div>
  )

  const fromBins = fromStore.data?.bins.filter((b) => b.isActive) ?? []
  const toBins = toStore.data?.bins.filter((b) => b.isActive) ?? []
  const binSelect = (value: string, bins: typeof fromBins, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!editable} aria-label={label} className={cellInput}>
      <option value="">—</option>
      {bins.map((b) => <option key={b.binId} value={b.binId}>{b.binCode}</option>)}
      {value && !bins.some((b) => b.binId === value) && <option value={value}>{value.slice(0, 8)}</option>}
    </select>
  )
  const grid = (
    <>
      <datalist id="adj-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
      <LineItemsEditor
        items={lines}
        getKey={(l) => l.key}
        readOnly={!editable}
        columns={[
          {
            id: 'code', header: 'Stock Code', className: 'w-32',
            cell: (l, i) => <input value={l.code} list="adj-items" disabled={!editable} aria-label={`Stock Code ${i + 1}`} className={`${cellInput} font-mono`}
              onChange={(e) => { const it = items.data?.find((x) => x.itemCode.toUpperCase() === e.target.value.trim().toUpperCase()); setLine(i, { code: e.target.value, itemId: it?.itemId ?? '' }) }} />,
          },
          { id: 'desc', header: 'Description', cell: (l) => <span className="text-sm">{itemOf(l.itemId)?.descriptionEn ?? l.description}</span> },
          { id: 'uom', header: 'UOM', className: 'w-14', cell: (l) => <span className="text-sm">{itemOf(l.itemId)?.baseUomCode ?? l.uom}</span> },
          { id: 'bin', header: 'Location', className: 'w-24', cell: (l, i) => binSelect(l.binId, fromBins, (v) => setLine(i, { binId: v }), `Location ${i + 1}`) },
          ...(isTrf ? [{ id: 'toBin', header: t('docs.toBin'), className: 'w-24', cell: (l: Line, i: number) => binSelect(l.toBinId, toBins, (v) => setLine(i, { toBinId: v }), `To bin ${i + 1}`) }] : []),
          { id: 'qty', header: 'Qty', className: 'w-20', cell: (l, i) => <input type="number" step="any" min={0} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} disabled={!editable} aria-label={`Qty ${i + 1}`} className={cellInput} /> },
          ...(transfer && status !== 'DRAFT' ? [{ id: 'rcv', header: t('docs.received'), className: 'w-20 text-right', cell: (l: Line) => <span className="text-sm tabular-nums">{l.receivedQty ?? '—'}</span> }] : []),
          {
            id: 'price', header: 'Price', className: 'w-24',
            cell: (l, i) => <input type="number" step="0.01" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} disabled={!editable || type !== 'INCREASE'} placeholder={type === 'INCREASE' ? t('docs.avgCost') : ''} aria-label={`Price ${i + 1}`} className={cellInput} />,
          },
          { id: 'total', header: 'Total', className: 'w-24 text-right', cell: (l) => <span className="text-sm tabular-nums">{money(lineAmount(l))}</span> },
        ]}
        onAdd={() => setLines((ls) => [...ls, { key: `n${Date.now()}`, itemId: '', code: '', description: '', uom: '', binId: '', toBinId: '', stockLotId: null, qty: '1', price: '', amount: null, receivedQty: null }])}
        onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
        addLabel={t('wo.addPart')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.oneLine')}
      />
    </>
  )

  const no = current?.documentNo ?? ''
  const cancelLabel = status === 'POSTED' || status === 'IN_TRANSIT' ? t('docs.action.reverse') : t('docs.action.cancel')
  return (
    <>
      <FormLayout
        title={current?.documentNo ?? t('common.new')}
        subtitle={TYPE_LABEL[type] ?? type}
        tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${lines.length})`, content: grid }]}
        isNew={!current}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {can.cancel && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('cancel', `${cancelLabel} · ${no}`, status !== 'DRAFT')}>{cancelLabel}</ToolbarButton>}
            {can.approve && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('approval', `${t('wo.action.REJECTED')} · ${no}`, true, (reason) => ({ decision: 'REJECTED', reason }))}>{t('wo.action.REJECTED')}</ToolbarButton>}
            {can.approve && <ToolbarButton tone="success" disabled={busy} onClick={() => acts.run('approval', { decision: 'APPROVED', reason: null })}>{t('wo.action.APPROVED')}</ToolbarButton>}
            {can.receive && <ToolbarButton tone="success" disabled={busy} onClick={() => acts.run('receive', {})}>{t('docs.action.receiveAll')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && <ToolbarButton tone="success" disabled={busy} onClick={() => persist(true)}>{isTrf ? t('docs.action.ship') : t('wr.action.submit')}</ToolbarButton>}
            {editable && <ToolbarButton tone="primary" disabled={busy} onClick={() => persist(false)}>{m.save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {acts.dialogNode}
    </>
  )
}
