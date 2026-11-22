'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { FormLayout } from '@/components/shared/FormLayout'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { PartyCodeInput, SupplierCodeInput } from '@/components/shared/PartyInputs'
import { AssetCodeInput, DriverCodeInput } from '@/components/meters/MeterBits'
import { Alert, Loading, cellInput, fmtDate, money, num, useSaveFailure } from '@/components/docs/DocBits'
import { TireChangeFilters } from '@/components/tire-changes/TireChangeFilters'
import { TireMaintenanceFilters } from '@/components/tire-maintenance/TireMaintenanceFilters'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useWorkOrders } from '@/lib/api/fleet/workOrders'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useCodeList } from '@/lib/api/fleet/setup'
import { DEFAULT_TYRE_CONDITIONS, TYRE_CONDITION_LIST, changeLines, useAxleMap, useTyreDocument, useTyreDocuments, useTyreMutations, useTyres, type TyreAction, type TyreDocumentDto } from '@/lib/api/fleet/tyres'

export type TyreDocKind = 'CHANGE' | 'MAINTENANCE'
const BASE: Record<TyreDocKind, string> = { CHANGE: '/fleet/tires/changes', MAINTENANCE: '/fleet/tires/maintenance' }
const col = createColumnHelper<TyreDocumentDto>()
const REASONS = ['WORN_OUT', 'PUNCTURE', 'SIDEWALL', 'IRREGULAR_WEAR', 'SEPARATION', 'ROTATION', 'RECAP', 'OTHER']
const DESTS = ['STOCK', 'RECAP', 'REPAIR', 'SCRAP']
const CHANGE_ACTIONS = ['REPLACE', 'INSTALL', 'REMOVE', 'ROTATE']
export const MAINT_ACTIONS = ['INSPECTION', 'REPAIR', 'RETREAD', 'RECEIVE_RECAP', 'SCRAP']

// ── lists ───────────────────────────────────────────────────────────────────
export function TyreDocumentsListView(p: { kind: TyreDocKind; documentNo: string; party: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useTyreDocuments({ kind: p.kind, search: p.documentNo || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  const q = p.party.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) => !q || (d.assetCode ?? '').toUpperCase().includes(q) || (d.supplierPartyCode ?? '').toUpperCase().includes(q))
  const open = (d: TyreDocumentDto) => router.push(`${BASE[p.kind]}/${d.tyreDocumentId}`)
  const no = col.display({ id: 'no', header: () => t('common.docDate'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left font-mono text-sm">{d.documentNo}</button><span className="text-xs text-gray-400">{fmtDate(d.documentDate)}</span></div> })
  const act = col.display({ id: 'act', header: '', size: 60, cell: ({ row: { original: d } }) => <button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline">{t('common.view')}</button> })
  const columns = p.kind === 'CHANGE'
    ? [
        no,
        col.display({ id: 'eq', header: () => t('common.equipment'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{d.assetCode ?? '—'}</span><span className="text-xs text-gray-400">{d.lines.length} {t('tyre.events')}</span></div> }),
        col.display({ id: 'drv', header: 'Driver / WO', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.driverCode ?? '—'}</span><span className="text-xs text-gray-400 font-mono">{d.workOrderNo ?? ''}</span></div> }),
        col.display({ id: 'meter', header: 'Meter / Changed By', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm tabular-nums">{d.meterKm === null ? '—' : `${num(d.meterKm).toLocaleString('en-US')} km`}</span><span className="text-xs text-gray-400">{d.performedByName ?? ''}</span></div> }),
        act,
      ]
    : [
        no,
        col.display({ id: 'vendor', header: 'Vendor / Equipment', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{d.supplierPartyCode ?? '—'}</span><span className="text-xs text-gray-400 font-mono">{d.assetCode ?? ''}</span></div> }),
        col.display({ id: 'insp', header: 'Inspector / Required', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.performedByName ?? '—'}</span><span className="text-xs text-gray-400">{fmtDate(d.requiredDate)}</span></div> }),
        col.display({ id: 'amt', header: () => t('common.amount'), cell: ({ row: { original: d } }) => <div className="flex flex-col text-right"><span className="text-sm font-semibold">{money(d.totalAmount)}</span><span className="text-xs text-gray-400">{d.lines.length} {t('tyre.events')}</span></div> }),
        act,
      ]
  const title = p.kind === 'CHANGE' ? t('nav.tireChanges') : t('nav.tireMaintenance')
  return (
    <ListPage
      title={title}
      subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.tyre.manage') && <Link href={`${BASE[p.kind]}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {title}</Link>}
      filters={p.kind === 'CHANGE'
        ? <TireChangeFilters documentNo={p.documentNo} equipmentCode={p.party} dateFrom={p.dateFrom} dateTo={p.dateTo} />
        : <TireMaintenanceFilters documentNo={p.documentNo} vendorName={p.party} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

export function TyreDocumentView({ kind, id }: { kind: TyreDocKind; id: string }) {
  const doc = useTyreDocument(id === 'new' ? null : id)
  if (id === 'new') return kind === 'CHANGE' ? <NewChange /> : <NewMaintenance />
  if (doc.isLoading) return <Loading />
  if (!doc.data) return <p className="text-sm text-red-600">Not found.</p>
  return <ReadOnlyDocument kind={kind} d={doc.data} />
}

// ── saved document (read-only: posted at once) ──────────────────────────────
function ReadOnlyDocument({ kind, d }: { kind: TyreDocKind; d: TyreDocumentDto }) {
  const { t } = useT()
  const router = useRouter()
  const ro = (v: string | null | undefined) => <input readOnly value={v ?? ''} placeholder="—" className={inputClass(false, true)} />
  const header = kind === 'CHANGE' ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label={t('form.documentNo')}>{ro(d.documentNo)}</Field>
      <Field label={t('form.date')}>{ro(fmtDate(d.documentDate))}</Field>
      <Field label={t('form.equipmentCode')}>{ro(d.assetCode)}</Field>
      <Field label="Changed By">{ro(d.performedByName)}</Field>
      <Field label={t('form.woNo')}>{ro(d.workOrderNo)}</Field>
      <Field label={t('form.driverName')}>{ro(d.driverCode)}</Field>
      <Field label={t('form.hours')}>{ro(d.meterHours === null ? '' : String(num(d.meterHours)))}</Field>
      <Field label={t('form.category')}>{ro(d.category)}</Field>
      <Field label={t('form.odometer')}>{ro(d.meterKm === null ? '' : num(d.meterKm).toLocaleString('en-US'))}</Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}>{ro(d.remarks)}</Field></div>
    </div>
  ) : (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={t('form.documentNo')}>{ro(d.documentNo)}</Field>
        <Field label={t('form.date')}>{ro(fmtDate(d.documentDate))}</Field>
        <Field label={t('form.equipmentCode')}>{ro(d.assetCode)}</Field>
        <Field label={t('form.vendor')}>{ro(d.supplierPartyCode)}</Field>
        <Field label="Inspector">{ro(d.performedByName)}</Field>
        <Field label="Inspection Date">{ro(d.inspectionDate ? fmtDate(d.inspectionDate) : '')}</Field>
        <Field label={t('form.requiredDate')}>{ro(d.requiredDate ? fmtDate(d.requiredDate) : '')}</Field>
        <Field label="Billing Customer">{ro(d.billToPartyCode)}</Field>
        <Field label="VAT (%)">{ro(String(num(d.taxRate)))}</Field>
        <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}>{ro(d.remarks)}</Field></div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-3 gap-4 text-right">
        <div><p className="text-xs text-gray-500">Total Amount</p><p className="text-sm">{money(d.subtotalAmount)}</p></div>
        <div><p className="text-xs text-gray-500">VAT Amount</p><p className="text-sm">{money(d.taxAmount)}</p></div>
        <div><p className="text-xs text-gray-500">Nett Amount</p><p className="text-base font-bold">{money(d.totalAmount)}</p></div>
      </div>
    </div>
  )
  const changeRows = changeLines(d.lines)
  const lines = kind === 'CHANGE' ? (
    <table className="w-full text-sm">
      <thead className="text-xs text-gray-500"><tr className="text-left border-b"><th className="py-2">{t('common.type')}</th><th>Old Serial No.</th><th>New Serial No.</th><th>Position</th><th>Condition</th><th>{t('docs.reason')}</th><th>Remarks</th></tr></thead>
      <tbody>{changeRows.map((l) => (
        <tr key={l.lineNo} className="border-b last:border-0">
          <td className="py-1.5 text-xs font-medium">{l.action}</td><td className="font-mono">{l.oldSerialNo || '—'}</td><td className="font-mono">{l.newSerialNo || '—'}</td>
          <td className="font-mono text-xs">{l.position}{l.toPosition ? ` → ${l.toPosition}` : ''}</td><td className="text-xs">{l.condition || '—'}</td>
          <td className="text-xs">{l.reason}{l.destination ? ` → ${l.destination}` : ''}</td><td className="text-xs">{l.remarks}</td>
        </tr>
      ))}</tbody>
    </table>
  ) : (
    <table className="w-full text-sm">
      <thead className="text-xs text-gray-500"><tr className="text-left border-b"><th className="py-2">Type</th><th>Serial No.</th><th className="text-right">Meter Read</th><th className="text-right">Before</th><th className="text-right">After</th><th className="text-right">{t('common.amount')}</th><th>Remarks</th></tr></thead>
      <tbody>{d.lines.map((e) => (
        <tr key={e.tyreEventId} className="border-b last:border-0">
          <td className="py-1.5 text-xs font-medium">{e.eventType}</td><td className="font-mono">{e.serialNo}</td>
          <td className="text-right tabular-nums">{e.meterKm === null ? '—' : num(e.meterKm).toLocaleString('en-US')}</td>
          <td className="text-right tabular-nums">{e.treadBeforeMm === null ? '—' : num(e.treadBeforeMm)}</td><td className="text-right tabular-nums">{e.treadMm === null ? '—' : num(e.treadMm)}</td>
          <td className="text-right tabular-nums">{money(e.cost)}</td><td className="text-xs">{e.remarks ?? ''}</td>
        </tr>
      ))}</tbody>
    </table>
  )
  return (
    <FormLayout
      title={d.documentNo}
      subtitle={t('tyre.postedReadOnly')}
      tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${kind === 'CHANGE' ? changeRows.length : d.lines.length})`, content: lines }]}
      actions={<ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>}
    />
  )
}

// ── new tyre change ─────────────────────────────────────────────────────────
interface ChangeRow { key: string; action: string; position: string; toPosition: string; tyreId: string; reasonCode: string; destination: string; treadMm: string; condition: string; remarks: string }

function NewChange() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { change } = useTyreMutations()
  const wos = useWorkOrders({})
  const stock = useTyres({ status: 'IN_STOCK' })
  const [assetCode, setAssetCode] = useState('')
  const [asset, setAsset] = useState<{ id: string; equipmentType?: string } | null>(null)
  const map = useAxleMap(asset?.id ?? null, '2d')
  const [driverCode, setDriverCode] = useState('')
  const [driverId, setDriverId] = useState<string | null>(null)
  const [h, setH] = useState({ date: new Date().toISOString().slice(0, 10), changedBy: '', woNo: '', category: '', meterKm: '', meterHours: '', remarks: '' })
  const conditionList = useCodeList(TYRE_CONDITION_LIST)
  const conditionCodes = conditionList.data?.length ? conditionList.data.filter((c) => c.isActive).map((c) => c.code) : DEFAULT_TYRE_CONDITIONS
  const [rows, setRows] = useState<ChangeRow[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const positions = map.data?.positions ?? []
  const tyreAt = (code: string) => positions.find((p) => p.code === code)?.tyre ?? null
  const setRow = (i: number, p: Partial<ChangeRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)))

  const submit = async () => {
    setBanner(null)
    if (!asset) { setBanner(t('tyre.rule.asset')); return }
    if (!rows.length) { setBanner(t('docs.rule.oneLine')); return }
    const wo = h.woNo.trim() ? wos.data?.find((w) => w.documentNo.toUpperCase() === h.woNo.trim().toUpperCase()) : undefined
    if (h.woNo.trim() && !wo) { setBanner(t('docs.rule.woUnknown')); return }
    const nr = (v: string) => (v.trim() === '' ? null : Number(v))
    const lines: TyreAction[] = rows.map((r) => ({
      action: r.action, position: r.position || null, toPosition: r.action === 'ROTATE' ? r.toPosition || null : null,
      tyreId: r.action === 'INSTALL' || r.action === 'REPLACE' ? r.tyreId || null : null,
      reasonCode: r.action === 'REMOVE' || r.action === 'REPLACE' ? r.reasonCode || null : r.action === 'ROTATE' ? 'ROTATION' : null,
      destination: r.action === 'REMOVE' || r.action === 'REPLACE' ? r.destination || null : null,
      treadMm: r.action === 'REMOVE' ? nr(r.treadMm) : null, treadBeforeMm: r.action === 'REPLACE' ? nr(r.treadMm) : null,
      condition: r.condition.trim() || null, cost: 0, remarks: r.remarks.trim() || null,
    }))
    try {
      const doc = await change.mutateAsync({
        assetProfileId: asset.id, lines, documentDate: h.date || null, meterKm: nr(h.meterKm), meterHours: nr(h.meterHours), workOrderId: wo?.workOrderId ?? null, driverId,
        performedByName: h.changedBy.trim() || null, category: h.category.trim() || null, remarks: h.remarks.trim() || null,
      })
      toast.success(t('tireMap.posted'), doc.documentNo)
      router.push(`${BASE.CHANGE}/${doc.tyreDocumentId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const header = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={t('form.documentNo')}><input readOnly placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
      <Field label={`${t('form.date')} *`}><input type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} className={inputClass()} /></Field>
      <Field label={`${t('form.equipmentCode')} *`}><AssetCodeInput id="tch-asset" value={assetCode} onChange={(v) => { setAssetCode(v); setRows([]) }} onResolve={(a) => setAsset(a ? { id: a.id, equipmentType: a.equipmentType } : null)} className={inputClass()} /></Field>
      <Field label="Equipment Type"><input readOnly value={asset?.equipmentType ?? ''} className={inputClass(false, true)} /></Field>
      <Field label="Changed By"><input value={h.changedBy} onChange={(e) => setH({ ...h, changedBy: e.target.value })} className={inputClass()} /></Field>
      <Field label={t('form.woNo')}>
        <input value={h.woNo} list="tch-wos" onChange={(e) => setH({ ...h, woNo: e.target.value.toUpperCase() })} className={`${inputClass()} font-mono`} />
        <datalist id="tch-wos">{wos.data?.filter((w) => !['CLOSED', 'CANCELLED'].includes(w.status) && (!asset || w.assetProfileId === asset.id)).map((w) => <option key={w.workOrderId} value={w.documentNo}>{w.assetCode}</option>)}</datalist>
      </Field>
      <Field label={t('form.driverName')}><DriverCodeInput id="tch-driver" value={driverCode} onChange={setDriverCode} onResolve={(d) => setDriverId(d?.id ?? null)} className={inputClass()} /></Field>
      <Field label={t('form.hours')}><input type="number" step="any" value={h.meterHours} onChange={(e) => setH({ ...h, meterHours: e.target.value })} className={inputClass()} /></Field>
      <Field label={t('form.category')}><input value={h.category} onChange={(e) => setH({ ...h, category: e.target.value.toUpperCase() })} className={inputClass()} /></Field>
      <Field label={t('form.odometer')} hint={map.data?.odometerKm ? `${num(map.data.odometerKm).toLocaleString('en-US')} km` : undefined}><input type="number" step="any" value={h.meterKm} onChange={(e) => setH({ ...h, meterKm: e.target.value })} className={inputClass()} /></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={h.remarks} onChange={(e) => setH({ ...h, remarks: e.target.value })} rows={2} className={`${inputClass()} resize-none`} /></Field></div>
    </div>
  )

  const posOptions = (filled: boolean | null) => positions.filter((p) => filled === null || !!p.tyre === filled)
  const grid = !asset ? <p className="text-sm text-gray-500">{t('tyre.rule.asset')}</p> : map.error ? <Alert>{errorText(map.error, t)}</Alert> : (
    <>
      <datalist id="tch-stock">{stock.data?.map((x) => <option key={x.tyreId} value={x.serialNo}>{[x.brandCode, x.sizeCode].filter(Boolean).join(' ')}</option>)}</datalist>
      <LineItemsEditor
        items={rows}
        getKey={(r) => r.key}
        columns={[
          { id: 'action', header: t('common.type'), className: 'w-28', cell: (r, i) => <select value={r.action} onChange={(e) => setRow(i, { action: e.target.value, position: '', tyreId: '', toPosition: '' })} aria-label={`Action ${i + 1}`} className={cellInput}>{CHANGE_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}</select> },
          {
            id: 'pos', header: 'Position', className: 'w-24',
            cell: (r, i) => (
              <select value={r.position} onChange={(e) => setRow(i, { position: e.target.value })} aria-label={`Position ${i + 1}`} className={cellInput}>
                <option value="">—</option>
                {posOptions(r.action === 'INSTALL' ? false : true).map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
              </select>
            ),
          },
          { id: 'old', header: 'Old Serial No.', className: 'w-32', cell: (r) => <span className="font-mono text-sm">{r.action === 'INSTALL' ? '—' : tyreAt(r.position)?.serialNo ?? '—'}</span> },
          {
            id: 'new', header: 'New Serial No.', className: 'w-36',
            cell: (r, i) => r.action === 'ROTATE'
              ? <select value={r.toPosition} onChange={(e) => setRow(i, { toPosition: e.target.value })} aria-label={`To position ${i + 1}`} className={cellInput}><option value="">→ {t('tyre.position')}</option>{positions.filter((p) => p.code !== r.position).map((p) => <option key={p.code} value={p.code}>{p.code}{p.tyre ? ` (${p.tyre.serialNo})` : ''}</option>)}</select>
              : r.action === 'REMOVE' ? <span className="text-gray-400">—</span>
              : <input list="tch-stock" aria-label={`New serial ${i + 1}`} className={`${cellInput} font-mono`} defaultValue={stock.data?.find((x) => x.tyreId === r.tyreId)?.serialNo ?? ''}
                  onChange={(e) => setRow(i, { tyreId: stock.data?.find((x) => x.serialNo.toUpperCase() === e.target.value.trim().toUpperCase())?.tyreId ?? '' })} />,
          },
          {
            id: 'why', header: `${t('docs.reason')} / ${t('tyre.destination')}`, className: 'w-44',
            cell: (r, i) => r.action === 'REMOVE' || r.action === 'REPLACE' ? (
              <div className="flex gap-1">
                <select value={r.reasonCode} onChange={(e) => setRow(i, { reasonCode: e.target.value })} aria-label={`Reason ${i + 1}`} className={`${cellInput} text-xs`}>{REASONS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                <select value={r.destination} onChange={(e) => setRow(i, { destination: e.target.value })} aria-label={`Destination ${i + 1}`} className={`${cellInput} text-xs`}>{DESTS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              </div>
            ) : <span className="text-gray-400">—</span>,
          },
          { id: 'tread', header: t('tyre.treadOut'), className: 'w-20', cell: (r, i) => r.action === 'REMOVE' || r.action === 'REPLACE' ? <input type="number" step="0.1" value={r.treadMm} onChange={(e) => setRow(i, { treadMm: e.target.value })} aria-label={`Tread ${i + 1}`} className={cellInput} /> : <span className="text-gray-400">—</span> },
          { id: 'cond', header: 'Condition', className: 'w-32', cell: (r, i) => <select value={r.condition} onChange={(e) => setRow(i, { condition: e.target.value })} aria-label={`Condition ${i + 1}`} className={cellInput}><option value="">—</option>{conditionCodes.map((c) => <option key={c} value={c}>{c}</option>)}</select> },
          { id: 'rem', header: 'Remarks', cell: (r, i) => <input value={r.remarks} onChange={(e) => setRow(i, { remarks: e.target.value })} aria-label={`Remarks ${i + 1}`} className={cellInput} /> },
        ]}
        onAdd={() => setRows((rs) => [...rs, { key: `n${Date.now()}`, action: 'REPLACE', position: '', toPosition: '', tyreId: '', reasonCode: 'WORN_OUT', destination: 'RECAP', treadMm: '', condition: '', remarks: '' }])}
        onRemove={(i) => setRows((rs) => rs.filter((_, j) => j !== i))}
        addLabel={t('tyre.addLine')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.oneLine')}
      />
    </>
  )
  return (
    <FormLayout
      title={`${t('common.new')} ${t('nav.tireChanges')}`}
      subtitle={t('tyre.postedAtOnce')}
      tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${rows.length})`, content: grid }]}
      isNew
      actions={<div className="flex gap-2"><ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton><ToolbarButton tone="primary" disabled={change.isPending} onClick={submit}>{change.isPending ? t('common.loading') : t('docs.action.post')}</ToolbarButton></div>}
    />
  )
}

// ── new tyre maintenance ────────────────────────────────────────────────────
interface MaintRow { key: string; action: string; serial: string; tyreId: string; treadBefore: string; treadAfter: string; cost: string; remarks: string }

/** Lines → TyreAction (maintenance). RETREAD = send to the recapper; RECEIVE_RECAP = back with new tread. */
export function maintenanceLine(r: Pick<MaintRow, 'action' | 'tyreId' | 'treadBefore' | 'treadAfter' | 'cost' | 'remarks'>): TyreAction {
  const nr = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    action: r.action, tyreId: r.tyreId || null, treadBeforeMm: nr(r.treadBefore), treadMm: nr(r.treadAfter),
    destination: r.action === 'RETREAD' ? 'RECAP' : null, cost: Number(r.cost || 0), remarks: r.remarks.trim() || null,
  }
}

export function NewMaintenance({ preset }: { preset?: { action: string; tyreId: string; serial: string; supplier?: string | null } }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { maintenance } = useTyreMutations()
  const { currentBranchId } = useBranchContext()
  const tyres = useTyres({})
  const [assetCode, setAssetCode] = useState('')
  const [assetId, setAssetId] = useState<string | null>(null)
  const [h, setH] = useState({ date: new Date().toISOString().slice(0, 10), supplier: preset?.supplier ?? '', inspector: '', inspectionDate: new Date().toISOString().slice(0, 10), requiredDate: '', billTo: '', vat: '7', remarks: '' })
  const [rows, setRows] = useState<MaintRow[]>(preset ? [{ key: 'p', action: preset.action, serial: preset.serial, tyreId: preset.tyreId, treadBefore: '', treadAfter: '', cost: '', remarks: '' }] : [])
  const [banner, setBanner] = useState<string | null>(null)
  const setRow = (i: number, p: Partial<MaintRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const subtotal = useMemo(() => rows.reduce((s, r) => s + Number(r.cost || 0), 0), [rows])
  const vatAmt = Math.round(subtotal * Number(h.vat || 0)) / 100

  const submit = async () => {
    setBanner(null)
    if (!currentBranchId) { setBanner(t('tyre.rule.branch')); return }
    if (!rows.length || rows.some((r) => !r.tyreId)) { setBanner(t('tyre.rule.tyreLines')); return }
    try {
      const doc = await maintenance.mutateAsync({
        branchId: currentBranchId, lines: rows.map(maintenanceLine), documentDate: h.date || null, supplierPartyCode: h.supplier.trim() || null, assetProfileId: assetId,
        inspectorName: h.inspector.trim() || null, inspectionDate: h.inspectionDate || null, requiredDate: h.requiredDate || null,
        billToPartyCode: h.billTo.trim() || null, taxRate: Number(h.vat || 0), remarks: h.remarks.trim() || null,
      })
      toast.success(t('tireMap.posted'), doc.documentNo)
      router.push(`${BASE.MAINTENANCE}/${doc.tyreDocumentId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const header = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
        <Field label={t('form.documentNo')}><input readOnly placeholder="Auto-generated" className={inputClass(false, true)} /></Field>
        <Field label={`${t('form.date')} *`}><input type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} className={inputClass()} /></Field>
        <Field label={t('form.equipmentCode')}><AssetCodeInput id="tmn-asset" value={assetCode} onChange={setAssetCode} onResolve={(a) => setAssetId(a?.id ?? null)} className={inputClass()} /></Field>
        <Field label={t('form.vendor')}><SupplierCodeInput id="tmn-supplier" value={h.supplier} onChange={(v) => setH({ ...h, supplier: v })} className={inputClass()} /></Field>
        <Field label="Inspector"><input value={h.inspector} onChange={(e) => setH({ ...h, inspector: e.target.value })} className={inputClass()} /></Field>
        <Field label="Inspection Date"><input type="date" value={h.inspectionDate} onChange={(e) => setH({ ...h, inspectionDate: e.target.value })} className={inputClass()} /></Field>
        <Field label={t('form.requiredDate')}><input type="date" value={h.requiredDate} onChange={(e) => setH({ ...h, requiredDate: e.target.value })} className={inputClass()} /></Field>
        <Field label="Billing Customer"><PartyCodeInput id="tmn-billto" value={h.billTo} onChange={(v) => setH({ ...h, billTo: v })} className={inputClass()} /></Field>
        <Field label="VAT (%)"><input type="number" step="0.01" value={h.vat} onChange={(e) => setH({ ...h, vat: e.target.value })} className={inputClass()} /></Field>
        <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={h.remarks} onChange={(e) => setH({ ...h, remarks: e.target.value })} rows={2} className={`${inputClass()} resize-none`} /></Field></div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-3 gap-4 text-right">
        <div><p className="text-xs text-gray-500">Total Amount</p><p className="text-sm">{money(subtotal)}</p></div>
        <div><p className="text-xs text-gray-500">VAT Amount</p><p className="text-sm">{money(vatAmt)}</p></div>
        <div><p className="text-xs text-gray-500">Nett Amount</p><p className="text-base font-bold">{money(subtotal + vatAmt)}</p></div>
      </div>
    </div>
  )
  const grid = (
    <>
      <datalist id="tmn-tyres">{tyres.data?.map((x) => <option key={x.tyreId} value={x.serialNo}>{x.status} · {[x.brandCode, x.sizeCode].filter(Boolean).join(' ')}</option>)}</datalist>
      <LineItemsEditor
        items={rows}
        getKey={(r) => r.key}
        columns={[
          { id: 'type', header: 'Type', className: 'w-36', cell: (r, i) => <select value={r.action} onChange={(e) => setRow(i, { action: e.target.value })} aria-label={`Type ${i + 1}`} className={cellInput}>{MAINT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}</select> },
          { id: 'serial', header: 'Serial No.', className: 'w-36', cell: (r, i) => <input value={r.serial} list="tmn-tyres" aria-label={`Serial ${i + 1}`} className={`${cellInput} font-mono`} onChange={(e) => setRow(i, { serial: e.target.value.toUpperCase(), tyreId: tyres.data?.find((x) => x.serialNo.toUpperCase() === e.target.value.trim().toUpperCase())?.tyreId ?? '' })} /> },
          { id: 'before', header: 'Before', className: 'w-20', cell: (r, i) => <input type="number" step="0.1" value={r.treadBefore} onChange={(e) => setRow(i, { treadBefore: e.target.value })} aria-label={`Before ${i + 1}`} className={cellInput} /> },
          { id: 'after', header: 'After', className: 'w-20', cell: (r, i) => <input type="number" step="0.1" value={r.treadAfter} onChange={(e) => setRow(i, { treadAfter: e.target.value })} aria-label={`After ${i + 1}`} className={cellInput} /> },
          { id: 'cost', header: t('common.amount'), className: 'w-24', cell: (r, i) => <input type="number" step="0.01" value={r.cost} onChange={(e) => setRow(i, { cost: e.target.value })} aria-label={`Cost ${i + 1}`} className={cellInput} /> },
          { id: 'rem', header: 'Remarks', cell: (r, i) => <input value={r.remarks} onChange={(e) => setRow(i, { remarks: e.target.value })} aria-label={`Remarks ${i + 1}`} className={cellInput} /> },
        ]}
        onAdd={() => setRows((rs) => [...rs, { key: `n${Date.now()}`, action: 'INSPECTION', serial: '', tyreId: '', treadBefore: '', treadAfter: '', cost: '', remarks: '' }])}
        onRemove={(i) => setRows((rs) => rs.filter((_, j) => j !== i))}
        addLabel={t('tyre.addLine')}
        removeLabel={t('wo.removeLine')}
        emptyText={t('docs.rule.oneLine')}
      />
    </>
  )
  return (
    <FormLayout
      title={`${t('common.new')} ${t('nav.tireMaintenance')}`}
      subtitle={t('tyre.postedAtOnce')}
      tabs={[{ id: 'header', label: t('form.header'), content: header }, { id: 'lines', label: `${t('form.lineItems')} (${rows.length})`, content: grid }]}
      isNew
      actions={<div className="flex gap-2"><ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton><ToolbarButton tone="primary" disabled={maintenance.isPending} onClick={submit}>{maintenance.isPending ? t('common.loading') : t('docs.action.post')}</ToolbarButton></div>}
    />
  )
}
