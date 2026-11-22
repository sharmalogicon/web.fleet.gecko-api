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
import { GoodsReceiptFilters } from '@/components/goods-receipts/GoodsReceiptFilters'
import { Alert, Loading, StatusPill, cellInput, fmtDate, money, num, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { receiptLineFromPo, useDoc, useDocList, useDocMutations, useOpenPoLines, type OpenPoLine } from '@/lib/api/fleet/documents'
import { useItems } from '@/lib/api/fleet/items'
import { useWarehouse, useWarehouses } from '@/lib/api/fleet/warehouses'
import { useWorkOrders } from '@/lib/api/fleet/workOrders'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

type GRN = components['schemas']['GoodsReceiptDto']
const col = createColumnHelper<GRN>()
const BASE = '/fleet/goods-receipts'

/** Receipt API status → screen: POSTED shows as RECEIVED. */
export const viewReceiptStatus = (s: string) => (s === 'POSTED' ? 'RECEIVED' : s)
const STATUS_CLASS: Record<string, string> = { DRAFT: 'bg-blue-100 text-blue-700', RECEIVED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
const pill = (s: string) => <StatusPill view={viewReceiptStatus(s)} api={s} className={STATUS_CLASS[viewReceiptStatus(s)] ?? 'bg-gray-100 text-gray-700'} />

export function GoodsReceiptsListView(p: { documentNo: string; vendorName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useDocList<GRN>('goodsReceipts', { search: p.documentNo || undefined, supplierName: p.vendorName.trim() || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  // supplierName is filtered by the API (backend #11).
  const rows = (list.data ?? []).filter((d) => p.status === 'ALL' || viewReceiptStatus(d.status) === p.status)
  const open = (d: GRN) => router.push(`${BASE}/${d.goodsReceiptId}`)
  const columns = [
    col.display({ id: 'no', header: 'Receipt No / Date', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(d.documentDate)}</span></div> }),
    col.display({ id: 'vendor', header: () => t('common.vendor'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm text-gray-900 font-medium">{d.supplierName ?? d.supplierPartyCode}</span><span className="text-xs text-gray-400 font-mono">{d.purchaseOrderNo ?? d.supplierPartyCode}</span></div> }),
    col.display({ id: 'by', header: 'Received By', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.receivedByName ?? '—'}</span><span className="text-xs text-gray-400">{d.deliveryNoteNo ?? ''}</span></div> }),
    col.display({ id: 'amount', header: () => t('common.amount'), cell: ({ row: { original: d } }) => <div className="text-right text-sm font-semibold text-gray-900">{money(d.totalAmount)}</div> }),
    col.display({ id: 'status', header: () => t('common.status'), size: 130, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button></div> }),
  ]
  return (
    <ListPage
      title={t('nav.goodsReceipts')}
      subtitle={`${rows.length} receipt${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.purchase.receive') && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.goodsReceipts')}</Link>}
      filters={<GoodsReceiptFilters documentNo={p.documentNo} vendorName={p.vendorName} status={p.status} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

interface Line {
  key: string; purchaseOrderLineId: string | null; poNo: string; itemId: string | null; code: string; description: string; uomCode: string
  poQty: number | null; poPrice: number; qty: string; unitPrice: string; binId: string; lotNo: string; serialNo: string; expiryDate: string
  woNo: string; directToWorkOrderId: string | null; remarks: string; read?: GRN['lines'][number]
}

/** A grid line from an open PO line (qty = still open, price = the PO's). */
export function lineFromOpenPo(o: OpenPoLine): Line {
  const d = receiptLineFromPo(o)
  return {
    key: `p${o.purchaseOrderLineId}`, purchaseOrderLineId: d.purchaseOrderLineId, poNo: o.purchaseOrderNo, itemId: o.itemId, code: o.itemCode ?? '',
    description: o.description, uomCode: o.uomCode, poQty: num(o.pendingQty), poPrice: num(o.unitPrice), qty: String(d.qty), unitPrice: String(num(o.unitPrice)),
    binId: '', lotNo: '', serialNo: '', expiryDate: '', woNo: '', directToWorkOrderId: null, remarks: '',
  }
}

export function GoodsReceiptView({ id }: { id: string }) {
  const doc = useDoc<GRN>('goodsReceipts', id === 'new' ? null : id)
  if (id === 'new') return <GoodsReceiptForm />
  if (doc.isLoading) return <Loading />
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <GoodsReceiptForm key={doc.data.rowVersion} current={doc.data} />
}

function GoodsReceiptForm({ current }: { current?: GRN }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save, action } = useDocMutations<GRN>('goodsReceipts')
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const branchId = current?.branchId ?? currentBranchId ?? ''
  const items = useItems({ active: true })
  const stores = useWarehouses({ branchId, active: true }, !!branchId)
  const wos = useWorkOrders({})
  const [supplier, setSupplier] = useState(current?.supplierPartyCode ?? '')
  const [supplierName, setSupplierName] = useState<string | null>(current?.supplierName ?? null)
  const [warehouseId, setWarehouseId] = useState(current?.warehouseId ?? '')
  const [purchaseOrderId, setPurchaseOrderId] = useState(current?.purchaseOrderId ?? '')
  const [receivedBy, setReceivedBy] = useState(current?.receivedByName ?? '')
  const [deliveryNote, setDeliveryNote] = useState(current?.deliveryNoteNo ?? '')
  const [invoiceNo, setInvoiceNo] = useState(current?.supplierInvoiceNo ?? '')
  const [receivedAt, setReceivedAt] = useState(current?.receivedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState(current?.remarks ?? '')
  const [taxRate, setTaxRate] = useState(String(current ? num(current.taxRate) : 7))
  const [discount, setDiscount] = useState(String(num(current?.discountAmount)))
  const [lines, setLines] = useState<Line[]>((current?.lines ?? []).map((l) => ({
    key: l.goodsReceiptLineId, purchaseOrderLineId: l.purchaseOrderLineId, poNo: l.purchaseOrderNo ?? '', itemId: l.itemId, code: l.itemCode ?? '',
    description: l.description, uomCode: l.uomCode, poQty: l.poQty === null ? null : num(l.poQty), poPrice: num(l.unitPrice), qty: String(num(l.qty)),
    unitPrice: String(num(l.unitPrice)), binId: l.binId ?? '', lotNo: l.lotNo ?? '', serialNo: l.serialNo ?? '', expiryDate: l.expiryDate?.slice(0, 10) ?? '',
    woNo: '', directToWorkOrderId: l.directToWorkOrderId, remarks: l.remarks ?? '', read: l,
  })))
  const [banner, setBanner] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const store = useWarehouse(warehouseId || null)
  const status = current?.status ?? 'NEW'
  const manage = current ? canAt('fleet.purchase.receive', branchId) : canAnywhere('fleet.purchase.receive')
  const editable = (status === 'NEW' || status === 'DRAFT') && manage
  const canCancel = (status === 'DRAFT' || status === 'POSTED') && manage
  const acts = useDocActions(action, current?.goodsReceiptId, current?.rowVersion)
  const pos = useDocList<components['schemas']['PurchaseOrderDto']>('purchaseOrders', { supplierPartyCode: supplier.trim() || undefined }, editable && !!supplier.trim())
  const openPos = (pos.data ?? []).filter((po) => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status))
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const busy = save.isPending || action.isPending
  const tracking = (l: Line) => items.data?.find((x) => x.itemId === l.itemId)?.tracking ?? 'NONE'
  const lineTotal = (l: Line) => (l.read && !editable ? num(l.read.lineAmount) : Math.round(num(l.qty) * num(l.unitPrice) * 100) / 100)
  // Owner answer 11 Q4: VAT and a header discount are keyed on the receipt (VAT defaults from the PO).
  const subtotal = current && !editable ? num(current.subtotalAmount) : lines.reduce((s, l) => s + lineTotal(l), 0)
  const tax = current && !editable ? num(current.taxAmount) : Math.round((subtotal - num(discount)) * num(taxRate)) / 100
  const total = current && !editable ? num(current.totalAmount) : subtotal - num(discount) + tax

  const persist = async (post: boolean) => {
    setBanner(null)
    if (!supplier.trim()) { setBanner(t('docs.rule.supplier')); return }
    if (!warehouseId) { setBanner(t('docs.rule.store')); return }
    if (!lines.length) { setBanner(t('docs.rule.oneLine')); return }
    const missing = lines.find((l) => (tracking(l) === 'LOT' && !l.lotNo.trim()) || (tracking(l) === 'SERIAL' && !l.serialNo.trim()))
    if (missing) { setBanner(`${missing.code}: ${t('docs.rule.lotSerial')}`); return }
    const body = {
      warehouseId, supplierPartyCode: supplier.trim().toUpperCase(), purchaseOrderId: purchaseOrderId || null, deliveryNoteNo: deliveryNote.trim() || null,
      supplierInvoiceNo: invoiceNo.trim() || null, receivedAt: receivedAt ? `${receivedAt}T00:00:00Z` : null, receivedByName: receivedBy.trim() || null,
      taxRate: num(taxRate), discountAmount: num(discount), remarks: remarks.trim() || null,
      lines: lines.map((l) => {
        const wo = l.woNo.trim() ? wos.data?.find((w) => w.documentNo.toUpperCase() === l.woNo.trim().toUpperCase()) : undefined
        const base = l.purchaseOrderLineId
          ? receiptLineFromPo({ purchaseOrderLineId: l.purchaseOrderLineId, pendingQty: l.poQty ?? 0, unitPrice: l.poPrice }, num(l.qty), num(l.unitPrice))
          : { purchaseOrderLineId: null, qty: num(l.qty), unitPrice: num(l.unitPrice) }
        return {
          ...base, itemId: l.purchaseOrderLineId ? null : l.itemId, description: l.purchaseOrderLineId || l.itemId ? null : l.description || null,
          uomCode: l.purchaseOrderLineId ? null : l.uomCode || null, binId: l.binId || null, lotNo: l.lotNo.trim() || null, serialNo: l.serialNo.trim() || null,
          expiryDate: l.expiryDate || null, directToWorkOrderId: wo?.workOrderId ?? l.directToWorkOrderId ?? null, remarks: l.remarks.trim() || null,
        }
      }),
      post: post && !current, rowVersion: current?.rowVersion ?? null,
    }
    try {
      let saved = await save.mutateAsync({ id: current?.goodsReceiptId, body })
      if (post && current) saved = await action.mutateAsync({ id: saved.goodsReceiptId, action: 'post', body: { reason: null, rowVersion: saved.rowVersion } })
      toast.success(t('docs.saved'), saved.documentNo)
      if (!current) router.push(`${BASE}/${saved.goodsReceiptId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${t('form.documentNo')} *`}><input readOnly value={current?.documentNo ?? ''} placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.date')} *`}><input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={`${t('form.vendor')} *`} hint={supplierName ?? undefined}>
        <SupplierCodeInput id="grn-supplier" value={supplier} onChange={setSupplier} onName={(n) => n && setSupplierName(n)} disabled={!editable || lines.length > 0} className={inputClass(false, !editable || lines.length > 0)} />
      </Field>
      <Field label={t('form.poNo')}>
        {editable ? (
          <select value={purchaseOrderId} onChange={(e) => { setPurchaseOrderId(e.target.value); const po = openPos.find((x) => x.purchaseOrderId === e.target.value); if (po) setTaxRate(String(num(po.taxRate))) }} disabled={lines.length > 0} className={inputClass(false, lines.length > 0)}>
            <option value="">—</option>
            {openPos.map((po) => <option key={po.purchaseOrderId} value={po.purchaseOrderId}>{po.documentNo}</option>)}
          </select>
        ) : <input readOnly value={current?.purchaseOrderNo ?? ''} placeholder="—" className={inputClass(false, true)} />}
      </Field>
      <Field label={`${t('docs.store')} *`}>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!editable || lines.length > 0} className={inputClass(false, !editable || lines.length > 0)}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </Field>
      <Field label="Receipt By"><input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={t('docs.deliveryNote')}><input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={t('docs.supplierInvoice')}><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={t('common.status')}><div className="pt-1">{current ? pill(current.status) : <span className="text-sm text-gray-500">—</span>}</div></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!editable} rows={3} className={`${inputClass(false, !editable)} resize-none`} /></Field></div>
      <Field label="VAT (%)"><input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label="Discount Amount"><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
        <div><p className="text-xs text-gray-500">{t('common.amount')}</p><p className="text-sm">{money(subtotal)}</p></div>
        <div><p className="text-xs text-gray-500">Discount Amount</p><p className="text-sm">{money(discount)}</p></div>
        <div><p className="text-xs text-gray-500">VAT</p><p className="text-sm">{money(tax)}</p></div>
        <div><p className="text-xs text-gray-500">Total Amount</p><p className="text-base font-bold">{money(total)}</p></div>
      </div>
    </div>
  )

  const bins = store.data?.bins.filter((b) => b.isActive) ?? []
  const grid = (
    <>
      <datalist id="grn-wos">{wos.data?.filter((w) => !['CLOSED', 'CANCELLED'].includes(w.status)).map((w) => <option key={w.workOrderId} value={w.documentNo}>{w.assetCode}</option>)}</datalist>
      {editable && (
        <div className="mb-3">
          <ToolbarButton disabled={!supplier.trim() || !warehouseId} onClick={() => setPicking(true)}>{t('docs.addFromPo')}</ToolbarButton>
          {(!supplier.trim() || !warehouseId) && <span className="ml-2 text-xs text-gray-500">{t('docs.rule.supplierStoreFirst')}</span>}
        </div>
      )}
      <LineItemsEditor
        items={lines}
        getKey={(l) => l.key}
        readOnly={!editable}
        columns={[
          { id: 'code', header: 'Stock Code', className: 'w-28', cell: (l) => <div className="flex flex-col"><span className="font-mono text-sm">{l.code || '—'}</span><span className="text-[10px] text-gray-400">{l.poNo}</span></div> },
          { id: 'desc', header: 'Description', cell: (l) => <span className="text-sm">{l.description}</span> },
          { id: 'uom', header: 'UOM', className: 'w-14', cell: (l) => <span className="text-sm">{l.uomCode}</span> },
          { id: 'poQty', header: 'PO Qty', className: 'w-16 text-right', cell: (l) => <span className="text-sm tabular-nums">{l.poQty ?? '—'}</span> },
          { id: 'qty', header: 'Received', className: 'w-20', cell: (l, i) => <input type="number" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} disabled={!editable || tracking(l) === 'SERIAL'} aria-label={`Received ${i + 1}`} className={cellInput} /> },
          { id: 'price', header: 'Unit Price', className: 'w-24', cell: (l, i) => <input type="number" step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} disabled={!editable} aria-label={`Unit Price ${i + 1}`} className={cellInput} /> },
          {
            id: 'bin', header: t('docs.bin'), className: 'w-24',
            cell: (l, i) => (
              <select value={l.binId} onChange={(e) => setLine(i, { binId: e.target.value })} disabled={!editable} aria-label={`Bin ${i + 1}`} className={cellInput}>
                <option value="">—</option>
                {bins.map((b) => <option key={b.binId} value={b.binId}>{b.binCode}</option>)}
                {l.binId && !bins.some((b) => b.binId === l.binId) && <option value={l.binId}>{l.binId.slice(0, 8)}</option>}
              </select>
            ),
          },
          {
            id: 'lot', header: t('docs.lotSerial'), className: 'w-28',
            cell: (l, i) => tracking(l) === 'SERIAL'
              ? <input value={l.serialNo} onChange={(e) => setLine(i, { serialNo: e.target.value, qty: '1' })} disabled={!editable} aria-label={`Serial ${i + 1}`} placeholder="Serial *" className={cellInput} />
              : <input value={l.lotNo} onChange={(e) => setLine(i, { lotNo: e.target.value })} disabled={!editable || tracking(l) === 'NONE'} aria-label={`Lot ${i + 1}`} placeholder={tracking(l) === 'LOT' ? 'Lot *' : ''} className={cellInput} />,
          },
          { id: 'exp', header: t('docs.expiry'), className: 'w-32', cell: (l, i) => <input type="date" value={l.expiryDate} onChange={(e) => setLine(i, { expiryDate: e.target.value })} disabled={!editable || tracking(l) === 'NONE'} aria-label={`Expiry ${i + 1}`} className={cellInput} /> },
          { id: 'wo', header: t('docs.directToWo'), className: 'w-28', cell: (l, i) => <input value={l.woNo || (l.directToWorkOrderId ? wos.data?.find((w) => w.workOrderId === l.directToWorkOrderId)?.documentNo ?? '' : '')} onChange={(e) => setLine(i, { woNo: e.target.value.toUpperCase(), directToWorkOrderId: null })} list="grn-wos" disabled={!editable} aria-label={`Work order ${i + 1}`} className={`${cellInput} font-mono`} /> },
          { id: 'total', header: 'Total', className: 'w-24 text-right', cell: (l) => <span className="text-sm tabular-nums">{money(lineTotal(l))}</span> },
        ]}
        onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
        addLabel={t('docs.addFromPo')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.pickPoLines')}
      />
      {picking && (
        <OpenLinesPicker
          supplierPartyCode={supplier.trim().toUpperCase()}
          warehouseId={warehouseId}
          purchaseOrderId={purchaseOrderId}
          taken={new Set(lines.map((l) => l.purchaseOrderLineId ?? ''))}
          onPick={(picked) => { setLines((ls) => [...ls, ...picked.map(lineFromOpenPo)]); setPicking(false) }}
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

function OpenLinesPicker({ supplierPartyCode, warehouseId, purchaseOrderId, taken, onPick, onClose }: {
  supplierPartyCode: string; warehouseId: string; purchaseOrderId: string; taken: Set<string>; onPick: (l: OpenPoLine[]) => void; onClose: () => void
}) {
  const { t } = useT()
  const open = useOpenPoLines({ supplierPartyCode, warehouseId })
  const rows = (open.data ?? []).filter((l) => !taken.has(l.purchaseOrderLineId) && (!purchaseOrderId || l.purchaseOrderId === purchaseOrderId) && num(l.pendingQty) > 0)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Panel
      open
      variant="modal"
      title={t('docs.addFromPo')}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <ToolbarButton onClick={onClose}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={!sel.size} onClick={() => onPick(rows.filter((r) => sel.has(r.purchaseOrderLineId)))}>{t('docs.addSelected')} ({sel.size})</ToolbarButton>
        </div>
      )}
    >
      {open.isLoading ? <Loading /> : open.error ? <Alert>{errorText(open.error, t)}</Alert> : !rows.length ? <p className="text-sm text-gray-500 py-4">{t('docs.noOpenLines')}</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-2 w-8"><input type="checkbox" aria-label="all" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.purchaseOrderLineId)) : new Set())} /></th><th>PO</th><th>Stock Code</th><th>Description</th><th className="text-right">{t('docs.open')}</th><th className="text-right">Unit Price</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.purchaseOrderLineId} className="border-b last:border-0 cursor-pointer hover:bg-gray-50" onClick={() => toggle(r.purchaseOrderLineId)}>
                <td className="py-2"><input type="checkbox" aria-label={r.description} checked={sel.has(r.purchaseOrderLineId)} onChange={() => toggle(r.purchaseOrderLineId)} onClick={(e) => e.stopPropagation()} /></td>
                <td className="font-mono">{r.purchaseOrderNo}</td><td className="font-mono">{r.itemCode ?? '—'}</td><td>{r.description}</td>
                <td className="text-right tabular-nums">{num(r.pendingQty)} {r.uomCode}</td><td className="text-right tabular-nums">{money(r.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
