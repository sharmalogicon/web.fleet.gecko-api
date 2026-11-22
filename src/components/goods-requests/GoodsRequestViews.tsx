'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { useT } from '@/i18n/I18nContext'
import type { components } from '@/lib/api/fleet.schema'
import { useDoc, useDocList, useDocMutations, viewGoodsRequestStatus } from '@/lib/api/fleet/documents'
import { useItems } from '@/lib/api/fleet/items'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useWorkOrders } from '@/lib/api/fleet/workOrders'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { GOODS_REQUEST_STATUS_MAP } from '@/types/goods-request'

type GR = components['schemas']['GoodsRequestDto']
const col = createColumnHelper<GR>()
const cell = 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50'
const fmt = (d?: string | null) => (d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

function StatusCell({ d }: { d: GR }) {
  const s = viewGoodsRequestStatus(d.status)
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${GOODS_REQUEST_STATUS_MAP[s]}`}>{s}</span>
      {d.status !== s && <span className="text-[10px] text-gray-500">{d.status}</span>}
    </div>
  )
}

/** Goods Requests and Goods Requisitions: one API document (`/goods-requests`), two screens (prompt 11 §B). */
export function GoodsRequestsListView({ base, title, search, status }: { base: string; title: string; search: string; status: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useDocList<GR>('goodsRequests', { search: search || undefined })
  const rows = (list.data ?? []).filter((d) => status === 'ALL' || viewGoodsRequestStatus(d.status) === status)
  const open = (d: GR) => router.push(`${base}/${d.goodsRequestId}`)
  const columns = [
    col.display({ id: 'no', header: 'Req No / Date', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left font-mono text-sm">{d.documentNo}</button><span className="text-xs text-gray-400">{fmt(d.documentDate)}</span></div> }),
    col.display({ id: 'req', header: 'Required By / WO', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{fmt(d.requiredDate)}</span><span className="text-xs text-gray-400 font-mono">{d.workOrderNo ?? d.assetCode ?? '—'}</span></div> }),
    col.display({ id: 'job', header: 'Job Ref', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.jobRefNo ?? '—'}</span><span className="text-xs text-gray-400">{d.lines.length} {t('docs.lines')}</span></div> }),
    col.display({ id: 'status', header: () => t('common.status'), cell: ({ row: { original: d } }) => <StatusCell d={d} /> }),
    col.display({ id: 'actions', header: '', size: 60, cell: ({ row: { original: d } }) => <button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button> }),
  ]
  return (
    <ListPage
      title={title}
      subtitle={`${rows.length} found`}
      actions={canAnywhere('fleet.purchase.request') && <Link href={`${base}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {title}</Link>}
      filters={
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
          <select value={status} onChange={(e) => router.push(`${base}?status=${e.target.value}`)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
            {['ALL', 'OPEN', 'FULFILLED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? t('common.all') : s}</option>)}
          </select>
        </div>
      }
    >
      {list.isLoading ? <div className="flex justify-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        : list.error ? <div role="alert" className="m-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{errorText(list.error, t)}</div>
        : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

interface Line { key: string; itemId: string; code: string; description: string; qty: string; uomCode: string; remarks: string; supplier: string; read?: GR['lines'][number] }

export function GoodsRequestView({ base, id }: { base: string; id: string }) {
  const doc = useDoc<GR>('goodsRequests', id === 'new' ? null : id)
  if (id === 'new') return <GoodsRequestForm base={base} />
  if (doc.isLoading) return <div className="flex justify-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin" /></div>
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <GoodsRequestForm key={doc.data.rowVersion} base={base} current={doc.data} />
}

function GoodsRequestForm({ base, current }: { base: string; current?: GR }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const { save, action } = useDocMutations<GR>('goodsRequests')
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const branchId = current?.branchId ?? currentBranchId ?? ''
  const items = useItems({ active: true })
  const stores = useWarehouses({ branchId, active: true }, !!branchId)
  const wos = useWorkOrders({})
  const [reqDate] = useState(current?.documentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [requireDate, setRequireDate] = useState(current?.requiredDate?.slice(0, 10) ?? '')
  const [woNo, setWoNo] = useState(current?.workOrderNo ?? '')
  const [jobRef, setJobRef] = useState(current?.jobRefNo ?? '')
  const [remarks, setRemarks] = useState(current?.remarks ?? '')
  const [warehouseId, setWarehouseId] = useState(current?.warehouseId ?? '')
  const [lines, setLines] = useState<Line[]>((current?.lines ?? []).map((l) => ({
    key: l.goodsRequestLineId, itemId: l.itemId ?? '', code: l.itemCode ?? '', description: l.description, qty: String(l.qty), uomCode: l.uomCode,
    remarks: l.remarks ?? '', supplier: l.preferredSupplierPartyCode ?? '', read: l,
  })))
  const [banner, setBanner] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'reject' | 'cancel' | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const status = current?.status ?? 'NEW'
  const editable = (status === 'NEW' || status === 'DRAFT') && (current ? canAt('fleet.purchase.request', branchId) : canAnywhere('fleet.purchase.request'))
  const canApprove = status === 'SUBMITTED' && current?.approvalStatus === 'PENDING' && canAt('fleet.purchase.approve', branchId)
  const canCancel = ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(status) && canAt('fleet.purchase.request', branchId)
  const canPo = ['APPROVED', 'PARTIAL'].includes(status) && canAt('fleet.purchase.manage', branchId) && (current?.lines ?? []).some((l) => Number(l.openBaseQty) > 0)
  const wo = wos.data?.find((w) => w.documentNo.toUpperCase() === woNo.trim().toUpperCase())
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const busy = save.isPending || action.isPending

  const persist = async (submit: boolean) => {
    setBanner(null)
    if (!lines.length) { setBanner(t('docs.rule.oneLine')); return }
    if (woNo.trim() && !wo) { setBanner(t('docs.rule.woUnknown')); return }
    const body = {
      branchId, requiredDate: requireDate || null, warehouseId: warehouseId || null, workOrderId: wo?.workOrderId ?? null,
      assetProfileId: wo?.assetProfileId ?? current?.assetProfileId ?? null, jobRefNo: jobRef.trim() || null, remarks: remarks.trim() || null,
      lines: lines.map((l) => ({
        itemId: l.itemId || null, description: l.itemId ? null : l.description.trim() || null, qty: Number(l.qty), uomCode: l.uomCode.trim().toUpperCase() || null,
        woPartId: l.read?.woPartId ?? null, preferredSupplierPartyCode: l.supplier.trim().toUpperCase() || null, remarks: l.remarks.trim() || null,
      })),
      submit: submit && !current, rowVersion: current?.rowVersion ?? null,
    }
    try {
      let saved = await save.mutateAsync({ id: current?.goodsRequestId, body })
      if (submit && current) saved = await action.mutateAsync({ id: saved.goodsRequestId, action: 'submit', body: { reason: null, rowVersion: saved.rowVersion } })
      toast.success(t('docs.saved'), saved.documentNo)
      if (!current) router.push(`${base}/${saved.goodsRequestId}`)
    } catch (e) {
      setBanner(e instanceof ApiError && e.status === 400 ? Object.values(e.fieldMap).join(' ') || errorText(e, t) : errorText(e, t))
      if (e instanceof ApiError && e.status === 409) toast.warning(t('equipment.conflict'), errorText(e, t))
    }
  }

  const run = (act: string, body: object) => {
    if (!current) return
    setDialogError(null)
    action.mutate({ id: current.goodsRequestId, action: act, body: { ...body, rowVersion: current.rowVersion } }, {
      onSuccess: () => { toast.success(t('docs.done')); setDialog(null) },
      onError: (e) => { setDialogError(errorText(e, t)); if (!dialog) toast.error(t('common.saveFailed'), errorText(e, t)) },
    })
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div role="alert" className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{banner}</div>}
      <Field label="Request No. *"><input readOnly value={current?.documentNo ?? ''} placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
      <Field label="Request Date *"><input type="date" readOnly value={reqDate} className={inputClass(false, true)} /></Field>
      <Field label="Required By *"><input type="date" value={requireDate} onChange={(e) => setRequireDate(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label="Work Order No." hint={wo ? `${wo.assetCode}` : undefined}>
        <input value={woNo} onChange={(e) => setWoNo(e.target.value.toUpperCase())} list="gr-wos" disabled={!editable} className={inputClass(false, !editable)} />
        <datalist id="gr-wos">{wos.data?.filter((w) => !['CLOSED', 'CANCELLED'].includes(w.status)).map((w) => <option key={w.workOrderId} value={w.documentNo}>{w.assetCode}</option>)}</datalist>
      </Field>
      <Field label="Job Ref No."><input value={jobRef} onChange={(e) => setJobRef(e.target.value)} disabled={!editable} className={inputClass(false, !editable)} /></Field>
      <Field label={t('docs.store')}>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!editable} className={inputClass(false, !editable)}>
          <option value="">—</option>
          {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
        </select>
      </Field>
      <Field label="Status *"><div className="flex items-center gap-2"><input readOnly value={viewGoodsRequestStatus(status)} className={inputClass(false, true)} />{current && <span className="text-xs text-gray-500">{current.status}</span>}</div></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label="Remarks"><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!editable} rows={2} className={`${inputClass(false, !editable)} resize-none`} /></Field></div>
    </div>
  )

  const grid = (
    <>
      <datalist id="gr-items">{items.data?.map((x) => <option key={x.itemId} value={x.itemCode}>{x.descriptionEn}</option>)}</datalist>
      <LineItemsEditor
        items={lines}
        getKey={(l) => l.key}
        readOnly={!editable}
        columns={[
          {
            id: 'code', header: 'Stock Code', className: 'w-36',
            cell: (l, i) => <input value={l.code} list="gr-items" disabled={!editable} aria-label={`Stock Code ${i + 1}`} className={`${cell} font-mono`} placeholder={t('wo.freeText')}
              onChange={(e) => {
                const it = items.data?.find((x) => x.itemCode.toUpperCase() === e.target.value.trim().toUpperCase())
                setLine(i, { code: e.target.value, itemId: it?.itemId ?? '', ...(it ? { description: it.descriptionEn, uomCode: it.baseUomCode } : {}) })
              }} />,
          },
          { id: 'desc', header: 'Description', cell: (l, i) => <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} disabled={!editable || !!l.itemId} aria-label={`Description ${i + 1}`} className={cell} /> },
          { id: 'qty', header: 'Quantity', className: 'w-24', cell: (l, i) => <input type="number" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} disabled={!editable} aria-label={`Quantity ${i + 1}`} className={cell} /> },
          { id: 'uom', header: 'UOM', className: 'w-20', cell: (l, i) => <input value={l.uomCode} onChange={(e) => setLine(i, { uomCode: e.target.value })} disabled={!editable || !!l.itemId} aria-label={`UOM ${i + 1}`} className={`${cell} uppercase`} /> },
          { id: 'open', header: t('docs.orderedOpen'), className: 'w-28 text-right', cell: (l) => <span className="text-xs text-gray-500">{l.read ? `${Number(l.read.orderedBaseQty)} / ${Number(l.read.openBaseQty)}` : '—'}</span> },
          { id: 'remarks', header: 'Remarks', cell: (l, i) => <input value={l.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} disabled={!editable} aria-label={`Remarks ${i + 1}`} className={cell} /> },
        ]}
        onAdd={() => setLines((ls) => [...ls, { key: `n${Date.now()}`, itemId: '', code: '', description: '', qty: '1', uomCode: '', remarks: '', supplier: '' }])}
        onRemove={(i) => setLines((ls) => ls.filter((_, j) => j !== i))}
        addLabel={t('wo.addPart')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.oneLine')}
      />
    </>
  )

  return (
    <>
      <FormLayout
        title={current?.documentNo ?? t('common.new')}
        tabs={[{ id: 'general', label: t('form.general'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${lines.length})`, content: grid }]}
        isNew={!current}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canCancel && <ToolbarButton tone="danger" disabled={busy} onClick={() => setDialog('cancel')}>{t('docs.action.cancel')}</ToolbarButton>}
            {canApprove && <ToolbarButton tone="danger" disabled={busy} onClick={() => setDialog('reject')}>{t('wo.action.REJECTED')}</ToolbarButton>}
            {canApprove && <ToolbarButton tone="success" disabled={busy} onClick={() => run('approval', { decision: 'APPROVED', reason: null })}>{t('wo.action.APPROVED')}</ToolbarButton>}
            {canPo && <ToolbarButton tone="primary" onClick={() => router.push(`/fleet/purchase-orders/new?goodsRequestId=${current!.goodsRequestId}`)}>{t('docs.action.createPo')}</ToolbarButton>}
            <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
            {editable && <ToolbarButton disabled={busy} onClick={() => persist(true)}>{t('wr.action.submit')}</ToolbarButton>}
            {editable && <ToolbarButton tone="primary" disabled={busy} onClick={() => persist(false)}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
          </div>
        }
      />
      {dialog && (
        <ReasonDialog
          title={`${dialog === 'reject' ? t('wo.action.REJECTED') : t('docs.action.cancel')} · ${current?.documentNo}`}
          confirmLabel={dialog === 'reject' ? t('wo.action.REJECTED') : t('docs.action.cancel')}
          reasonRequired={dialog === 'reject'}
          danger
          busy={action.isPending}
          error={dialogError}
          onConfirm={(reason) => run(dialog === 'reject' ? 'approval' : 'cancel', dialog === 'reject' ? { decision: 'REJECTED', reason } : { reason: reason || null })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
