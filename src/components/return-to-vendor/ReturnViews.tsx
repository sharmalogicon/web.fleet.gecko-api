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
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { Panel } from '@/components/fleet-setup/ui'
import { ReturnFilters } from '@/components/return-to-vendor/ReturnFilters'
import { Alert, Loading, StatusPill, cellInput, fmtDate, money, num, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { useDoc, useDocList, useDocMutations } from '@/lib/api/fleet/documents'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

type RTV = components['schemas']['VendorReturnDto']
type GRN = components['schemas']['GoodsReceiptDto']
const col = createColumnHelper<RTV>()
const BASE = '/fleet/return-to-vendor'
export const RETURN_REASONS = ['DAMAGED', 'WRONG_ITEM', 'EXCESS', 'WARRANTY', 'OTHER'] as const
const STATUS_CLASS: Record<string, string> = { DRAFT: 'bg-blue-100 text-blue-700', POSTED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
const pill = (s: string) => <StatusPill view={s} className={STATUS_CLASS[s] ?? 'bg-gray-100 text-gray-700'} />

/** Posted receipt lines that still have something to return. */
export function returnableLines(receipts: GRN[]) {
  return receipts.flatMap((r) => r.lines
    .filter((l) => num(l.baseQty) - num(l.returnedBaseQty) > 0)
    .map((l) => ({ receipt: r, line: l, remaining: num(l.baseQty) - num(l.returnedBaseQty) })))
}

export function ReturnsListView(p: { documentNo: string; vendorName: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useDocList<RTV>('vendorReturns', { search: p.documentNo || undefined, supplierName: p.vendorName.trim() || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  // supplierName is filtered by the API (backend #11).
  const rows = list.data ?? []
  const open = (d: RTV) => router.push(`${BASE}/${d.vendorReturnId}`)
  const columns = [
    col.display({ id: 'no', header: 'Return No / Date', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(d.documentDate)}</span></div> }),
    col.display({ id: 'vendor', header: () => t('common.vendor'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm text-gray-900 font-medium">{d.supplierName ?? d.supplierPartyCode}</span><span className="text-xs text-gray-400 font-mono">{d.supplierPartyCode}</span></div> }),
    col.display({ id: 'by', header: 'Returned By', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.returnedByName ?? '—'}</span><span className="text-xs text-gray-400">{d.reasonCode ?? ''}</span></div> }),
    col.display({ id: 'amount', header: () => t('common.amount'), cell: ({ row: { original: d } }) => <div className="text-right text-sm font-semibold text-gray-900">{money(d.expectedCreditAmount)}</div> }),
    col.display({ id: 'status', header: () => t('common.status'), size: 120, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button></div> }),
  ]
  return (
    <ListPage
      title={t('nav.returnToVendor')}
      subtitle={`${rows.length} return${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.purchase.receive') && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.returnToVendor')}</Link>}
      filters={<ReturnFilters documentNo={p.documentNo} vendorName={p.vendorName} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

interface Line { key: string; goodsReceiptLineId: string; poNo: string; serialNo: string; code: string; description: string; max: number | null; qty: string; price: string; remarks: string }

export function ReturnView({ id }: { id: string }) {
  const doc = useDoc<RTV>('vendorReturns', id === 'new' ? null : id)
  if (id === 'new') return <ReturnForm />
  if (doc.isLoading) return <Loading />
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <ReturnForm key={doc.data.rowVersion} current={doc.data} />
}

function ReturnForm({ current }: { current?: RTV }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save, action } = useDocMutations<RTV>('vendorReturns')
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const branchId = current?.branchId ?? currentBranchId ?? ''
  const stores = useWarehouses({ branchId, active: true }, !!branchId)
  const [supplier, setSupplier] = useState(current?.supplierPartyCode ?? '')
  const [supplierName, setSupplierName] = useState<string | null>(current?.supplierName ?? null)
  const [warehouseId, setWarehouseId] = useState(current?.warehouseId ?? '')
  const [reasonCode, setReasonCode] = useState(current?.reasonCode ?? '')
  const [returnedBy, setReturnedBy] = useState(current?.returnedByName ?? '')
  const [remarks, setRemarks] = useState(current?.remarks ?? '')
  const [lines, setLines] = useState<Line[]>((current?.lines ?? []).map((l) => ({
    key: l.vendorReturnLineId, goodsReceiptLineId: l.goodsReceiptLineId, poNo: l.purchaseOrderNo ?? '', serialNo: l.serialNo ?? '', code: l.itemCode ?? '',
    description: l.description, max: null, qty: String(num(l.baseQty)), price: String(num(l.creditUnitPrice)), remarks: l.remarks ?? '',
  })))
  const [banner, setBanner] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const status = current?.status ?? 'NEW'
  const manage = current ? canAt('fleet.purchase.receive', branchId) : canAnywhere('fleet.purchase.receive')
  const editable = (status === 'NEW' || status === 'DRAFT') && manage
  const canCancel = (status === 'DRAFT' || status === 'POSTED') && manage
  const acts = useDocActions(action, current?.vendorReturnId, current?.rowVersion)
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const busy = save.isPending || action.isPending
  const total = current && !editable ? num(current.expectedCreditAmount) : lines.reduce((s, l) => s + num(l.qty) * num(l.price), 0)

  const persist = async (post: boolean) => {
    setBanner(null)
    if (!supplier.trim()) { setBanner(t('docs.rule.supplier')); return }
    if (!warehouseId) { setBanner(t('docs.rule.store')); return }
    if (!lines.length) { setBanner(t('docs.rule.oneLine')); return }
    const over = lines.find((l) => l.max !== null && num(l.qty) > l.max)
    if (over) { setBanner(`${over.code || over.description}: ${t('docs.rule.overReturn')} (${over.max})`); return }
    const body = {
      warehouseId, supplierPartyCode: supplier.trim().toUpperCase(), reasonCode: reasonCode || null, returnedByName: returnedBy.trim() || null, remarks: remarks.trim() || null,
      lines: lines.map((l) => ({ goodsReceiptLineId: l.goodsReceiptLineId, baseQty: num(l.qty), creditUnitPrice: l.price === '' ? null : num(l.price), remarks: l.remarks.trim() || null })),
      post: post && !current, rowVersion: current?.rowVersion ?? null,
    }
    try {
      let saved = await save.mutateAsync({ id: current?.vendorReturnId, body })
      if (post && current) saved = await action.mutateAsync({ id: saved.vendorReturnId, action: 'post', body: { reason: null, rowVersion: saved.rowVersion } })
      toast.success(t('docs.saved'), saved.documentNo)
      if (!current) router.push(`${BASE}/${saved.vendorReturnId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const locked = !editable || lines.length > 0
  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${t('form.documentNo')} *`}><input readOnly value={current?.documentNo ?? ''} placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.returnNo')} *`}><input type="date" readOnly value={current?.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.vendor')} *`}><input readOnly value={supplierName ?? ''} placeholder="—" className={inputClass(false, true)} /></Field>
      <Field label="Vendor Code"><SupplierCodeInput id="rtv-supplier" value={supplier} onChange={setSupplier} onName={(n) => n && setSupplierName(n)} disabled={locked} className={inputClass(false, locked)} /></Field>
      <Field label={`${t('docs.store')} *`}>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={locked} className={inputClass(false, locked)}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </Field>
      <Field label={t('docs.reason')}>
        <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} disabled={!editable} className={inputClass(false, !editable)}>
          <option value="">—</option>
          {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Returned By"><input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={t('form.amount')}><input readOnly value={money(total)} className={inputClass(false, true)} /></Field>
      <Field label={t('common.status')}><div className="pt-1">{current ? pill(current.status) : <span className="text-sm text-gray-500">—</span>}</div></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!editable} rows={3} className={`${inputClass(false, !editable)} resize-none`} /></Field></div>
    </div>
  )

  const grid = (
    <>
      <LineItemsEditor
        items={lines}
        getKey={(l) => l.key}
        readOnly={!editable}
        columns={[
          { id: 'po', header: 'PO No', className: 'w-28', cell: (l) => <span className="font-mono text-sm">{l.poNo || '—'}</span> },
          { id: 'serial', header: 'Serial No', className: 'w-28', cell: (l) => <span className="font-mono text-sm">{l.serialNo || '—'}</span> },
          { id: 'code', header: 'Stock Code', className: 'w-28', cell: (l) => <span className="font-mono text-sm">{l.code || '—'}</span> },
          { id: 'desc', header: 'Description', cell: (l) => <span className="text-sm">{l.description}</span> },
          { id: 'qty', header: 'Qty', className: 'w-24', cell: (l, i) => <input type="number" step="any" min={0} max={l.max ?? undefined} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} disabled={!editable || !!l.serialNo} aria-label={`Qty ${i + 1}`} className={cellInput} /> },
          { id: 'price', header: 'Unit Price', className: 'w-24', cell: (l, i) => <input type="number" step="0.01" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} disabled={!editable} aria-label={`Unit Price ${i + 1}`} className={cellInput} /> },
          { id: 'total', header: 'Total', className: 'w-24 text-right', cell: (l) => <span className="text-sm tabular-nums">{money(num(l.qty) * num(l.price))}</span> },
        ]}
        onAdd={supplier.trim() && warehouseId ? () => setPicking(true) : undefined}
        onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
        addLabel={t('docs.addFromReceipts')}
        removeLabel={t('wo.removeLine')}
        emptyText={supplier.trim() && warehouseId ? t('docs.rule.pickReceiptLines') : t('docs.rule.supplierStoreFirst')}
      />
      {picking && (
        <ReceiptLinesPicker
          supplierPartyCode={supplier.trim().toUpperCase()}
          warehouseId={warehouseId}
          taken={new Set(lines.map((l) => l.goodsReceiptLineId))}
          onPick={(picked) => {
            setLines((ls) => [...ls, ...picked.map(({ receipt, line, remaining }) => ({
              key: `r${line.goodsReceiptLineId}`, goodsReceiptLineId: line.goodsReceiptLineId, poNo: line.purchaseOrderNo ?? receipt.purchaseOrderNo ?? '',
              serialNo: line.serialNo ?? '', code: line.itemCode ?? '', description: line.description, max: remaining, qty: String(remaining),
              price: String(num(line.unitCostBase)), remarks: '',
            }))])
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )

  const no = current?.documentNo ?? ''
  return (
    <>
      <FormLayout
        title={current?.documentNo ?? t('common.new')}
        subtitle={current ? current.supplierName ?? current.supplierPartyCode : undefined}
        tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${lines.length})`, content: grid }]}
        isNew={!current}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canCancel && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('cancel', `${status === 'POSTED' ? t('docs.action.reverse') : t('docs.action.cancel')} · ${no}`, status === 'POSTED')}>{status === 'POSTED' ? t('docs.action.reverse') : t('docs.action.cancel')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && <ToolbarButton tone="success" disabled={busy} onClick={() => persist(true)}>{t('docs.action.post')}</ToolbarButton>}
            {editable && <ToolbarButton tone="primary" disabled={busy} onClick={() => persist(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {acts.dialogNode}
    </>
  )
}

function ReceiptLinesPicker({ supplierPartyCode, warehouseId, taken, onPick, onClose }: {
  supplierPartyCode: string; warehouseId: string; taken: Set<string>
  onPick: (l: ReturnType<typeof returnableLines>) => void; onClose: () => void
}) {
  const { t } = useT()
  const receipts = useDocList<GRN>('goodsReceipts', { supplierPartyCode, status: 'POSTED' })
  const rows = returnableLines((receipts.data ?? []).filter((r) => r.warehouseId === warehouseId)).filter((r) => !taken.has(r.line.goodsReceiptLineId))
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Panel
      open
      variant="modal"
      title={t('docs.addFromReceipts')}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <ToolbarButton onClick={onClose}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={!sel.size} onClick={() => onPick(rows.filter((r) => sel.has(r.line.goodsReceiptLineId)))}>{t('docs.addSelected')} ({sel.size})</ToolbarButton>
        </div>
      )}
    >
      {receipts.isLoading ? <Loading /> : receipts.error ? <Alert>{errorText(receipts.error, t)}</Alert> : !rows.length ? <p className="text-sm text-gray-500 py-4">{t('docs.noOpenLines')}</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-2 w-8" /><th>{t('nav.goodsReceipts')}</th><th>Stock Code</th><th>Description</th><th>Serial / Lot</th><th className="text-right">{t('docs.returnable')}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.line.goodsReceiptLineId} className="border-b last:border-0 cursor-pointer hover:bg-gray-50" onClick={() => toggle(r.line.goodsReceiptLineId)}>
                <td className="py-2"><input type="checkbox" aria-label={r.line.description} checked={sel.has(r.line.goodsReceiptLineId)} onChange={() => toggle(r.line.goodsReceiptLineId)} onClick={(e) => e.stopPropagation()} /></td>
                <td className="font-mono">{r.receipt.documentNo}</td><td className="font-mono">{r.line.itemCode ?? '—'}</td><td>{r.line.description}</td>
                <td className="font-mono text-xs">{r.line.serialNo ?? r.line.lotNo ?? '—'}</td><td className="text-right tabular-nums">{r.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
