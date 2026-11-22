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
import { POFilters } from '@/components/purchase-orders/POFilters'
import { Alert, Loading, StatusPill, cellInput, fmtDate, money, num, useDocActions, useSaveFailure } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { poActions, useDoc, useDocList, useDocMutations, viewPoStatus } from '@/lib/api/fleet/documents'
import { useItems } from '@/lib/api/fleet/items'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

type PO = components['schemas']['PurchaseOrderDto']
type GR = components['schemas']['GoodsRequestDto']
const col = createColumnHelper<PO>()
const BASE = '/fleet/purchase-orders'

export const PO_STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700', PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-green-100 text-green-700',
  SENT: 'bg-indigo-100 text-indigo-700', PARTIAL: 'bg-cyan-100 text-cyan-700', RECEIVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700',
}
const pill = (status: string) => { const v = viewPoStatus(status); return <StatusPill view={v} api={status} className={PO_STATUS_CLASS[v] ?? 'bg-gray-100 text-gray-700'} /> }

/** `/fleet/purchase-orders` on `/api/fleet/purchase-orders` (prompt 11 §C). Same columns as the mock list. */
export function PurchaseOrdersListView(p: { documentNo: string; vendorName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useDocList<PO>('purchaseOrders', { search: p.documentNo || undefined, supplierName: p.vendorName.trim() || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  const vendor = p.vendorName.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) =>
    (p.status === 'ALL' || viewPoStatus(d.status) === p.status) &&
    (!vendor || d.supplierPartyCode.toUpperCase().includes(vendor) || (d.supplierName ?? '').toUpperCase().includes(vendor)))
  const open = (d: PO) => router.push(`${BASE}/${d.purchaseOrderId}`)
  const columns = [
    col.display({ id: 'no', header: 'PO No / Date', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(d.documentDate)}</span></div> }),
    col.display({ id: 'vendor', header: () => t('common.vendor'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm text-gray-900 font-medium">{d.supplierName ?? d.supplierPartyCode}</span><span className="text-xs text-gray-400">{d.supplierPartyCode}{d.vendorQuoteNo ? ` · ${d.vendorQuoteNo}` : ''}</span></div> }),
    col.display({ id: 'req', header: 'Required By', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-bold text-gray-900">{fmtDate(d.requiredDate)}</span>{d.goodsRequestNo && <span className="text-xs text-gray-400">{d.goodsRequestNo}</span>}</div> }),
    col.display({ id: 'amount', header: () => t('common.amount'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5 text-right"><span className="text-sm font-semibold text-gray-900">{money(d.subtotalAmount)}</span>{num(d.totalAmount) !== num(d.subtotalAmount) && <span className="text-xs text-gray-400">Nett {money(d.totalAmount)}</span>}</div> }),
    col.display({ id: 'status', header: () => t('common.status'), size: 130, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline text-left">{t('common.edit')}</button></div> }),
  ]
  return (
    <ListPage
      title={t('nav.purchaseOrders')}
      subtitle={`${rows.length} purchase order${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.purchase.manage') && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.purchaseOrders')}</Link>}
      filters={<POFilters documentNo={p.documentNo} vendorName={p.vendorName} status={p.status} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

export interface PoLine {
  key: string; itemId: string; code: string; description: string; qty: string; uomCode: string; unitPrice: string
  discountType: string; discountValue: string; remarks: string; goodsRequestLineId: string | null; woPartId: string | null; workOrderId: string | null
  read?: PO['lines'][number]
}

/** Line amount as the API computes it (qty × price − discount), for the grid before saving. */
export function poLineAmount(l: Pick<PoLine, 'qty' | 'unitPrice' | 'discountType' | 'discountValue'>) {
  const gross = num(l.qty) * num(l.unitPrice)
  const d = num(l.discountValue)
  const disc = l.discountType === 'PERCENT' ? (gross * d) / 100 : l.discountType === 'AMOUNT' ? d : 0
  return Math.round((gross - disc) * 100) / 100
}

/** New PO lines from a goods request's open lines (prompt 11 §B "Create PO"): base qty, empty UoM = base unit. */
export function poLinesFromGoodsRequest(gr: GR): PoLine[] {
  return gr.lines.filter((l) => num(l.openBaseQty) > 0).map((l) => ({
    key: `g${l.goodsRequestLineId}`, itemId: l.itemId ?? '', code: l.itemCode ?? '', description: l.description, qty: String(num(l.openBaseQty)),
    uomCode: l.itemId ? '' : l.uomCode, unitPrice: '0', discountType: '', discountValue: '0', remarks: l.remarks ?? '',
    goodsRequestLineId: l.goodsRequestLineId, woPartId: l.woPartId ?? null, workOrderId: gr.workOrderId ?? null,
  }))
}

export function PurchaseOrderView({ id, goodsRequestId }: { id: string; goodsRequestId?: string }) {
  const doc = useDoc<PO>('purchaseOrders', id === 'new' ? null : id)
  const gr = useDoc<GR>('goodsRequests', id === 'new' && goodsRequestId ? goodsRequestId : null)
  if (id === 'new') {
    if (goodsRequestId && gr.isLoading) return <Loading />
    return <PurchaseOrderForm fromRequest={gr.data} />
  }
  if (doc.isLoading) return <Loading />
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <PurchaseOrderForm key={doc.data.rowVersion} current={doc.data} />
}

function PurchaseOrderForm({ current, fromRequest }: { current?: PO; fromRequest?: GR }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save, action } = useDocMutations<PO>('purchaseOrders')
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const branchId = current?.branchId ?? fromRequest?.branchId ?? currentBranchId ?? ''
  const items = useItems({ active: true })
  const stores = useWarehouses({ branchId, active: true }, !!branchId)
  const [requiredDate, setRequiredDate] = useState(current?.requiredDate?.slice(0, 10) ?? fromRequest?.requiredDate?.slice(0, 10) ?? '')
  const [supplier, setSupplier] = useState(current?.supplierPartyCode ?? fromRequest?.lines.find((l) => l.preferredSupplierPartyCode)?.preferredSupplierPartyCode ?? '')
  const [supplierName, setSupplierName] = useState<string | null>(current?.supplierName ?? null)
  const [quote, setQuote] = useState(current?.vendorQuoteNo ?? '')
  const [orderBy, setOrderBy] = useState(current?.orderedByName ?? '')
  const [term, setTerm] = useState(current?.paymentTermCode ?? '')
  const [taxRate, setTaxRate] = useState(String(current ? num(current.taxRate) : 7))
  const [discount, setDiscount] = useState(String(num(current?.discountAmount)))
  const [warehouseId, setWarehouseId] = useState(current?.warehouseId ?? fromRequest?.warehouseId ?? '')
  const [remarks, setRemarks] = useState(current?.remarks ?? '')
  const [lines, setLines] = useState<PoLine[]>(current
    ? current.lines.map((l) => ({
        key: l.purchaseOrderLineId, itemId: l.itemId ?? '', code: l.itemCode ?? '', description: l.description, qty: String(num(l.qty)), uomCode: l.uomCode,
        unitPrice: String(num(l.unitPrice)), discountType: l.discountType ?? '', discountValue: String(num(l.discountValue)), remarks: l.remarks ?? '',
        goodsRequestLineId: l.goodsRequestLineId, woPartId: l.woPartId, workOrderId: l.workOrderId, read: l,
      }))
    : fromRequest ? poLinesFromGoodsRequest(fromRequest) : [])
  const [banner, setBanner] = useState<string | null>(null)

  const status = current?.status ?? 'NEW'
  const can = poActions(status, current?.approvalStatus, {
    manage: current ? canAt('fleet.purchase.manage', branchId) : canAnywhere('fleet.purchase.manage'),
    approve: canAt('fleet.purchase.approve', branchId),
  })
  const editable = can.save
  const acts = useDocActions(action, current?.purchaseOrderId, current?.rowVersion)
  const setLine = (i: number, p: Partial<PoLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const busy = save.isPending || action.isPending
  const subtotal = current && !editable ? num(current.subtotalAmount) : lines.reduce((s, l) => s + poLineAmount(l), 0)
  const tax = current && !editable ? num(current.taxAmount) : Math.round((subtotal - num(discount)) * num(taxRate)) / 100
  const total = current && !editable ? num(current.totalAmount) : subtotal - num(discount) + tax

  const persist = async (submit: boolean) => {
    setBanner(null)
    if (!supplier.trim()) { setBanner(t('docs.rule.supplier')); return }
    if (!lines.length) { setBanner(t('docs.rule.oneLine')); return }
    const body = {
      branchId, supplierPartyCode: supplier.trim().toUpperCase(), requiredDate: requiredDate || null, warehouseId: warehouseId || null,
      paymentTermCode: term.trim() || null, vendorQuoteNo: quote.trim() || null, orderedByName: orderBy.trim() || null,
      goodsRequestId: current?.goodsRequestId ?? fromRequest?.goodsRequestId ?? null, workOrderId: current?.workOrderId ?? fromRequest?.workOrderId ?? null,
      currencyCode: current?.currencyCode ?? null, exchangeRate: current ? num(current.exchangeRate) : 1, discountAmount: num(discount),
      taxCode: current?.taxCode ?? null, taxRate: num(taxRate), remarks: remarks.trim() || null,
      lines: lines.map((l) => ({
        itemId: l.itemId || null, description: l.itemId ? null : l.description.trim() || null, uomCode: l.uomCode.trim().toUpperCase() || null,
        qty: num(l.qty), unitPrice: num(l.unitPrice), discountType: l.discountType || null, discountValue: num(l.discountValue),
        vendorPartNo: l.read?.vendorPartNo ?? null, goodsRequestLineId: l.goodsRequestLineId, workOrderId: l.workOrderId, woPartId: l.woPartId,
        requiredDate: l.read?.requiredDate ?? null, remarks: l.remarks.trim() || null,
      })),
      submit: submit && !current, rowVersion: current?.rowVersion ?? null,
    }
    try {
      let saved = await save.mutateAsync({ id: current?.purchaseOrderId, body })
      if (submit && current) saved = await action.mutateAsync({ id: saved.purchaseOrderId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
      toast.success(t('docs.saved'), saved.documentNo)
      if (!current) router.push(`${BASE}/${saved.purchaseOrderId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const ro = (v: string) => <input readOnly value={v} placeholder="—" className={inputClass(false, true)} />
  const header = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
        <Field label={`${t('form.documentNo')} *`}><input readOnly value={current?.documentNo ?? ''} placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
        <Field label={`${t('form.orderDate')} *`}><input type="date" readOnly value={current?.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} className={inputClass(false, true)} /></Field>
        <Field label={`${t('form.requiredDate')} *`}><input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
        <Field label={`${t('form.vendor')} *`}>{ro(supplierName ?? current?.supplierName ?? '')}</Field>
        <Field label="Vendor Code">
          <SupplierCodeInput id="po-supplier" value={supplier} onChange={setSupplier} onName={(n) => n && setSupplierName(n)} disabled={!editable} className={inputClass(false, !editable)} placeholder="e.g. BAP-001" />
        </Field>
        <Field label={t('form.quotationNo')}><input value={quote} onChange={(e) => setQuote(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
        <Field label="Order By"><input value={orderBy} onChange={(e) => setOrderBy(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
        <Field label="Credit Term"><input value={term} onChange={(e) => setTerm(e.target.value.toUpperCase())} disabled={!editable} className={inputClass(false, !editable)} placeholder="e.g. NET30" /></Field>
        <Field label="Goods Request No.">{ro(current?.goodsRequestNo ?? fromRequest?.documentNo ?? '')}</Field>
        <Field label="VAT (%)"><input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
        <Field label="Discount Amount"><input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
        <Field label={t('docs.store')}>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!editable} className={inputClass(false, !editable)}>
            <option value="">—</option>
            {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
          </select>
        </Field>
        <Field label="Approved By">{ro(current?.approvalStatus ?? '')}</Field>
        <Field label="Approved On">{ro(current?.approvedAt ? fmtDate(current.approvedAt) : '')}</Field>
        <Field label={t('common.status')}><div className="pt-1">{current ? pill(current.status) : <span className="text-sm text-gray-500">—</span>}</div></Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t('common.remarks')}><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!editable} rows={3} className={`${inputClass(false, !editable)} resize-none`} /></Field>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financial Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-0.5"><span className="text-xs text-gray-500">Discount Amount</span><span className="text-sm font-medium text-gray-800">{money(discount)}</span></div>
          <div className="flex flex-col gap-0.5"><span className="text-xs text-gray-500">Total VAT</span><span className="text-sm font-medium text-gray-800">{money(tax)}</span></div>
          <div className="flex flex-col gap-0.5"><span className="text-xs text-gray-500">Nett Amount</span><span className="text-sm font-medium text-gray-800">{money(total)}</span></div>
          <div className="flex flex-col gap-0.5"><span className="text-xs text-gray-500">Total Amount</span><span className="text-base font-bold text-gray-900">{money(subtotal)}</span></div>
        </div>
      </div>
    </div>
  )

  const grid = (
    <>
      <datalist id="po-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
      <LineItemsEditor
        items={lines}
        getKey={(l) => l.key}
        readOnly={!editable}
        columns={[
          {
            id: 'code', header: 'Stock Code', className: 'w-32',
            cell: (l, i) => <input value={l.code} list="po-items" disabled={!editable} aria-label={`Stock Code ${i + 1}`} className={`${cellInput} font-mono`} placeholder={t('wo.freeText')}
              onChange={(e) => {
                const it = items.data?.find((x) => x.itemCode.toUpperCase() === e.target.value.trim().toUpperCase())
                setLine(i, { code: e.target.value, itemId: it?.itemId ?? '', ...(it ? { description: it.descriptionEn, uomCode: it.baseUomCode } : {}) })
              }} />,
          },
          { id: 'desc', header: 'Description', cell: (l, i) => <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} disabled={!editable || !!l.itemId} aria-label={`Description ${i + 1}`} className={cellInput} /> },
          { id: 'uom', header: 'UOM', className: 'w-16', cell: (l, i) => <input value={l.uomCode} onChange={(e) => setLine(i, { uomCode: e.target.value })} disabled={!editable || !!l.itemId} aria-label={`UOM ${i + 1}`} className={`${cellInput} uppercase`} /> },
          { id: 'qty', header: 'Qty', className: 'w-20', cell: (l, i) => <input type="number" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} disabled={!editable} aria-label={`Qty ${i + 1}`} className={cellInput} /> },
          { id: 'price', header: 'Unit Price', className: 'w-24', cell: (l, i) => <input type="number" step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} disabled={!editable} aria-label={`Unit Price ${i + 1}`} className={cellInput} /> },
          {
            id: 'dtype', header: 'Disc. Type', className: 'w-24',
            cell: (l, i) => (
              <select value={l.discountType} onChange={(e) => setLine(i, { discountType: e.target.value })} disabled={!editable} aria-label={`Discount Type ${i + 1}`} className={cellInput}>
                <option value="">—</option><option value="PERCENT">%</option><option value="AMOUNT">฿</option>
              </select>
            ),
          },
          { id: 'dval', header: 'Discount', className: 'w-20', cell: (l, i) => <input type="number" step="0.01" value={l.discountValue} onChange={(e) => setLine(i, { discountValue: e.target.value })} disabled={!editable || !l.discountType} aria-label={`Discount ${i + 1}`} className={cellInput} /> },
          { id: 'amt', header: 'Total', className: 'w-24 text-right', cell: (l) => <span className="text-sm tabular-nums">{money(l.read && !editable ? l.read.lineAmount : poLineAmount(l))}</span> },
          { id: 'rcv', header: t('docs.receivedPending'), className: 'w-24 text-right', cell: (l) => <span className="text-xs text-gray-500">{l.read ? `${num(l.read.receivedQty)} / ${num(l.read.pendingQty)}` : '—'}</span> },
          { id: 'remarks', header: 'Remarks', cell: (l, i) => <input value={l.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} disabled={!editable} aria-label={`Remarks ${i + 1}`} className={cellInput} /> },
        ]}
        onAdd={() => setLines((ls) => [...ls, { key: `n${Date.now()}`, itemId: '', code: '', description: '', qty: '1', uomCode: '', unitPrice: '0', discountType: '', discountValue: '0', remarks: '', goodsRequestLineId: null, woPartId: null, workOrderId: null }])}
        onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
        addLabel={t('wo.addPart')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.oneLine')}
      />
    </>
  )

  const no = current?.documentNo ?? ''
  return (
    <>
      <FormLayout
        title={current?.documentNo ?? t('common.new')}
        subtitle={current ? `${current.supplierName ?? current.supplierPartyCode}` : undefined}
        tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${lines.length})`, content: grid }]}
        isNew={!current}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {can.cancel && current && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('cancel', `${t('docs.action.cancel')} · ${no}`)}>{t('docs.action.cancel')}</ToolbarButton>}
            {can.approve && <ToolbarButton tone="danger" disabled={busy} onClick={() => acts.ask('approval', `${t('wo.action.REJECTED')} · ${no}`, true, (reason) => ({ decision: 'REJECTED', reason }))}>{t('wo.action.REJECTED')}</ToolbarButton>}
            {can.approve && <ToolbarButton tone="success" disabled={busy} onClick={() => acts.run('approval', { decision: 'APPROVED', reason: null })}>{t('wo.action.APPROVED')}</ToolbarButton>}
            {can.send && <ToolbarButton tone="primary" disabled={busy} onClick={() => acts.run('send')}>{t('docs.action.send')}</ToolbarButton>}
            {can.close && <ToolbarButton disabled={busy} onClick={() => acts.ask('close', `${t('docs.action.closePo')} · ${no}`)}>{t('docs.action.closePo')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && <ToolbarButton disabled={busy} onClick={() => persist(true)}>{t('wr.action.submit')}</ToolbarButton>}
            {editable && <ToolbarButton tone="primary" disabled={busy} onClick={() => persist(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {acts.dialogNode}
    </>
  )
}
