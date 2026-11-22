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
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { Alert, Loading, StatusPill, fmtDate, money, num, useSaveFailure } from '@/components/docs/DocBits'
import { TireProfileFilters } from '@/components/tire-profiles/TireProfileFilters'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useWarehouses } from '@/lib/api/fleet/warehouses'
import { useAsset } from '@/lib/api/fleet/assets'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'
import { TYRE_CONDITION_LIST, useTyre, useTyreEvents, useTyreMutations, useTyres, viewTyreStatus, type SaveTyreRequest, type TyreDto } from '@/lib/api/fleet/tyres'
import { useCodeList } from '@/lib/api/fleet/setup'

const BASE = '/fleet/tires/profiles'
const col = createColumnHelper<TyreDto>()
export const VIEW_STATUS_CLASS: Record<string, string> = { NEW: 'bg-green-100 text-green-700', USED: 'bg-blue-100 text-blue-700', RECAP: 'bg-violet-100 text-violet-700', SCRAP: 'bg-red-100 text-red-700' }
export const API_STATUS_CLASS: Record<string, string> = {
  IN_STOCK: 'bg-gray-100 text-gray-700', FITTED: 'bg-emerald-100 text-emerald-700', AWAITING_REPAIR: 'bg-amber-100 text-amber-700',
  AT_RECAP: 'bg-violet-100 text-violet-700', SCRAPPED: 'bg-red-100 text-red-700',
}

export function TyreStatusBadges({ d }: { d: TyreDto }) {
  const v = viewTyreStatus(d)
  return (
    <div className="flex flex-wrap gap-1">
      <StatusPill view={v} className={VIEW_STATUS_CLASS[v]} />
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${API_STATUS_CLASS[d.status] ?? 'bg-gray-100 text-gray-700'}`}>{d.status}</span>
    </div>
  )
}

export function TyreProfilesListView(p: { serialNo: string; brand: string; tyreStatus: string; isActive: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const list = useTyres({ search: p.serialNo || undefined })
  const brand = p.brand.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) =>
    (!brand || (d.brandCode ?? '').toUpperCase().includes(brand)) &&
    (p.tyreStatus === 'ALL' || viewTyreStatus(d) === p.tyreStatus || d.status === p.tyreStatus) &&
    (p.isActive === 'ALL' || (p.isActive === 'ACTIVE') === d.isActive))
  const open = (d: TyreDto) => router.push(`${BASE}/${d.tyreId}`)
  const columns = [
    col.display({ id: 'serial', header: 'Serial / Brand', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left font-mono text-sm font-medium">{d.serialNo}</button><span className="text-xs text-gray-400">{d.brandCode ?? '—'}</span></div> }),
    col.display({ id: 'size', header: 'Size / Model', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.sizeCode ?? '—'}</span><span className="text-xs text-gray-400">{d.modelName ?? ''}</span></div> }),
    col.display({ id: 'status', header: 'Status / Condition', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1"><TyreStatusBadges d={d} /><span className="text-xs text-gray-500">{d.condition ?? '—'} · {d.currentTreadMm === null ? '—' : `${num(d.currentTreadMm)} mm`}</span></div> }),
    col.display({ id: 'eq', header: () => t('common.equipment'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{d.assetCode ?? '—'}</span><span className="text-xs text-gray-400">{d.positionCode ?? ''}{d.costPerKm !== null ? ` · ฿${num(d.costPerKm).toFixed(3)}/km` : ''}</span></div> }),
    col.display({ id: 'act', header: '', size: 60, cell: ({ row: { original: d } }) => <button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button> }),
  ]
  return (
    <ListPage
      title={t('nav.tireProfiles')}
      subtitle={`${rows.length} tyre${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.tyre.manage') && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.tireProfiles')}</Link>}
      filters={<TireProfileFilters serialNo={p.serialNo} brand={p.brand} tyreStatus={p.tyreStatus} isActive={p.isActive} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

export function TyreProfileView({ id }: { id: string }) {
  const tyre = useTyre(id === 'new' ? null : id)
  if (id === 'new') return <TyreProfileForm />
  if (tyre.isLoading) return <Loading />
  if (!tyre.data) return <p className="text-sm text-red-600">Not found.</p>
  return <TyreProfileForm key={tyre.data.rowVersion} current={tyre.data} />
}

type F = {
  serialNo: string; brandCode: string; modelName: string; sizeCode: string; plyRating: string; tyreType: string; recapCount: string
  condition: string; targetPsi: string; originalTreadMm: string; currentTreadMm: string; expectedKm: string; expectedHours: string
  purchasedDate: string; purchaseCost: string; supplierPartyCode: string; vendorInvoiceNo: string; purchaseOrderNo: string
  warrantyKm: string; warrantyUntil: string; isActive: boolean; remarks: string; warehouseId: string
}
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

/** Form values → SaveTyreRequest (status and place only change through actions). */
export function toSaveTyre(f: F, branchId: string, rowVersion?: string | null): SaveTyreRequest {
  const t = (v: string) => v.trim() || null
  const nr = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    serialNo: f.serialNo.trim().toUpperCase(), branchId, warehouseId: t(f.warehouseId), brandCode: t(f.brandCode)?.toUpperCase() ?? null, modelName: t(f.modelName),
    sizeCode: t(f.sizeCode), plyRating: t(f.plyRating), tyreType: f.tyreType || 'NEW', recapCount: Number(f.recapCount || 0),
    originalTreadMm: nr(f.originalTreadMm), currentTreadMm: nr(f.currentTreadMm), targetPsi: nr(f.targetPsi), condition: t(f.condition),
    expectedKm: nr(f.expectedKm), expectedHours: nr(f.expectedHours), purchasedDate: t(f.purchasedDate), purchaseCost: Number(f.purchaseCost || 0),
    supplierPartyCode: t(f.supplierPartyCode)?.toUpperCase() ?? null, vendorInvoiceNo: t(f.vendorInvoiceNo), purchaseOrderNo: t(f.purchaseOrderNo),
    warrantyKm: nr(f.warrantyKm), warrantyUntil: t(f.warrantyUntil), isActive: f.isActive, remarks: t(f.remarks), rowVersion: rowVersion ?? null,
  }
}

function TyreProfileForm({ current }: { current?: TyreDto }) {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { save } = useTyreMutations()
  const { canAt, canAnywhere } = useFleetAccess()
  const { currentBranchId } = useBranchContext()
  const branchId = current?.branchId ?? currentBranchId ?? ''
  const stores = useWarehouses({ branchId, active: true }, !!branchId && !current)
  const asset = useAsset(current?.assetProfileId ?? null)
  const events = useTyreEvents({ tyreId: current?.tyreId }, !!current)
  const conditionList = useCodeList(TYRE_CONDITION_LIST)
  // FLEET_TYRE_CONDITION code list only (#1); a saved code no longer in the list still shows.
  const listed = (conditionList.data ?? []).filter((c) => c.isActive).map((c) => ({ code: c.code, label: `${c.code} · ${c.descriptionEn}` }))
  const conditions = current?.condition && !listed.some((c) => c.code === current.condition) ? [...listed, { code: current.condition, label: current.condition }] : listed
  const [f, setF] = useState<F>({
    serialNo: s(current?.serialNo), brandCode: s(current?.brandCode), modelName: s(current?.modelName), sizeCode: s(current?.sizeCode), plyRating: s(current?.plyRating),
    tyreType: current?.tyreType ?? 'NEW', recapCount: s(current?.recapCount ?? 0), condition: current?.condition ?? '', targetPsi: s(current?.targetPsi),
    originalTreadMm: s(current?.originalTreadMm), currentTreadMm: s(current?.currentTreadMm), expectedKm: s(current?.expectedKm), expectedHours: s(current?.expectedHours),
    purchasedDate: s(current?.purchasedDate).slice(0, 10), purchaseCost: s(current?.purchaseCost ?? ''), supplierPartyCode: s(current?.supplierPartyCode),
    vendorInvoiceNo: s(current?.vendorInvoiceNo), purchaseOrderNo: s(current?.purchaseOrderNo), warrantyKm: s(current?.warrantyKm),
    warrantyUntil: s(current?.warrantyUntil).slice(0, 10), isActive: current?.isActive ?? true, remarks: s(current?.remarks), warehouseId: s(current?.warehouseId),
  })
  const [banner, setBanner] = useState<string | null>(null)
  const editable = current ? canAt('fleet.tyre.manage', branchId) : canAnywhere('fleet.tyre.manage')
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }))
  const dis = !editable
  const inp = (k: keyof F, extra: { type?: string; step?: string; upper?: boolean; locked?: boolean } = {}) => (
    <input type={extra.type ?? 'text'} step={extra.step} value={f[k] as string} disabled={dis || extra.locked}
      onChange={(e) => set({ [k]: extra.upper ? e.target.value.toUpperCase() : e.target.value } as Partial<F>)} className={inputClass(false, dis || extra.locked)} />
  )
  const ro = (v: string) => <input readOnly value={v} placeholder="—" className={inputClass(false, true)} />

  const persist = async () => {
    setBanner(null)
    if (!f.serialNo.trim() || !f.brandCode.trim() || !f.sizeCode.trim()) { setBanner(t('tyre.rule.required')); return }
    try {
      const saved = await save.mutateAsync({ id: current?.tyreId, body: toSaveTyre(f, branchId, current?.rowVersion) })
      toast.success(t('docs.saved'), saved.serialNo)
      if (!current) router.push(`${BASE}/${saved.tyreId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const general = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label={`${t('form.serialNo')} *`}>{inp('serialNo', { upper: true, locked: !!current })}</Field>
      <Field label={`${t('form.brand')} *`}>{inp('brandCode', { upper: true })}</Field>
      <Field label={t('form.model')}>{inp('modelName')}</Field>
      <Field label={`${t('form.tireSize')} *`}>{inp('sizeCode')}</Field>
      <Field label={`${t('form.status')} *`}>{current ? <div className="pt-1"><TyreStatusBadges d={current} /></div> : (
        <select value={f.tyreType} onChange={(e) => set({ tyreType: e.target.value })} disabled={dis} className={inputClass(false, dis)}><option value="NEW">NEW</option><option value="RECAP">RECAP</option></select>
      )}</Field>
      <Field label={`${t('form.condition')} *`}>
        <select value={f.condition} onChange={(e) => set({ condition: e.target.value })} disabled={dis} className={inputClass(false, dis)}>
          {!f.condition && <option value="">—</option>}
          {[...new Set([...conditions.map((c) => c.code), f.condition].filter(Boolean))].map((c) => <option key={c} value={c}>{conditions.find((x) => x.code === c)?.label ?? c}</option>)}
        </select>
      </Field>
      <Field label="Tyre Pressure (PSI)">{ro(current?.lastPressurePsi === null || current?.lastPressurePsi === undefined ? '' : String(num(current.lastPressurePsi)))}</Field>
      <Field label={t('tyre.targetPsi')}>{inp('targetPsi', { type: 'number', step: 'any' })}</Field>
      <Field label="Tread Depth (mm)">{inp('currentTreadMm', { type: 'number', step: '0.1' })}</Field>
      <Field label={t('tyre.originalTread')}>{inp('originalTreadMm', { type: 'number', step: '0.1' })}</Field>
      <Field label={t('tyre.plyRating')}>{inp('plyRating')}</Field>
      {!current && (
        <Field label={t('docs.store')}>
          <select value={f.warehouseId} onChange={(e) => set({ warehouseId: e.target.value })} disabled={dis} className={inputClass(false, dis)}>
            <option value="">—</option>
            {stores.data?.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseCode} · {w.nameEn}</option>)}
          </select>
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm pt-6"><input type="checkbox" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} disabled={dis} />{t('common.active')}</label>
      <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea value={f.remarks} onChange={(e) => set({ remarks: e.target.value })} disabled={dis} rows={2} className={`${inputClass(false, dis)} resize-none`} /></Field></div>
    </div>
  )
  const mileage = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Anticipated Mileage (km)">{inp('expectedKm', { type: 'number', step: 'any' })}</Field>
      <Field label="Actual Mileage (km)">{ro(current ? num(current.lifetimeKm).toLocaleString('en-US') : '')}</Field>
      <Field label="Anticipated Hours">{inp('expectedHours', { type: 'number', step: 'any' })}</Field>
      <Field label="Actual Hours">{ro(current ? String(num(current.lifetimeHours)) : '')}</Field>
      <Field label={t('tyre.recapCount')}>{current ? ro(String(num(current.recapCount))) : inp('recapCount', { type: 'number' })}</Field>
      <Field label={t('tyre.recapCost')}>{ro(current ? money(current.recapCostTotal) : '')}</Field>
      <Field label={t('tyre.inspectionCost')}>{ro(current ? money(current.inspectionCostTotal) : '')}</Field>
      <Field label={t('tyre.repairCost')}>{ro(current ? money(current.repairCostTotal) : '')}</Field>
      <Field label={t('tyre.totalCost')}>{ro(current ? money(current.totalCost) : '')}</Field>
      <Field label={t('tyre.costPerKm')}>{ro(current?.costPerKm === null || !current ? '' : `฿${num(current.costPerKm).toFixed(4)}`)}</Field>
    </div>
  )
  const purchase = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Purchased Date">{inp('purchasedDate', { type: 'date' })}</Field>
      <Field label="Purchased Price (฿)">{inp('purchaseCost', { type: 'number', step: '0.01' })}</Field>
      <Field label="Vendor"><SupplierCodeInput id="tyre-supplier" value={f.supplierPartyCode} onChange={(v) => set({ supplierPartyCode: v })} disabled={dis} className={inputClass(false, dis)} /></Field>
      <Field label="Vendor Invoice No.">{inp('vendorInvoiceNo')}</Field>
      <Field label={t('form.poNo')}>{inp('purchaseOrderNo', { upper: true })}</Field>
      <Field label="Warranty Mileage (km)">{inp('warrantyKm', { type: 'number', step: 'any' })}</Field>
      <Field label="Warranty Expiry Date">{inp('warrantyUntil', { type: 'date' })}</Field>
    </div>
  )
  const install = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <p className="sm:col-span-2 text-xs text-gray-500">{t('tyre.fitOnMap')} <Link href="/fleet/tires/axle-map" className="text-blue-600 hover:underline">{t('nav.tireAxleMap')}</Link></p>
      <Field label={t('form.equipmentCode')}>{ro(current?.assetCode ?? '')}</Field>
      <Field label={t('form.registrationNo')}>{ro(asset.data?.registrationNo ?? '')}</Field>
      <Field label="Tyre Position">{ro(current?.positionCode ?? '')}</Field>
      <Field label="Date Installed">{ro(current?.installedAt ? fmtDate(current.installedAt) : '')}</Field>
    </div>
  )
  const history = (
    events.isLoading ? <Loading /> : !events.data?.length ? <p className="text-sm text-gray-500">{t('tyre.noHistory')}</p> : (
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500"><tr className="text-left border-b"><th className="py-2">{t('common.date')}</th><th>{t('common.type')}</th><th>{t('tyre.position')}</th><th className="text-right">km</th><th className="text-right">{t('tyre.tread')}</th><th>{t('docs.reason')}</th><th>{t('tyre.destination')}</th><th className="text-right">{t('common.amount')}</th></tr></thead>
        <tbody>{events.data.map((e) => (
          <tr key={e.tyreEventId} className="border-b last:border-0">
            <td className="py-1.5">{fmtDate(e.eventAt)}</td><td className="text-xs font-medium">{e.eventType}</td>
            <td className="font-mono text-xs">{[e.fromPosition, e.toPosition].filter(Boolean).join(' → ') || '—'}</td>
            <td className="text-right tabular-nums">{e.meterKm === null ? '—' : num(e.meterKm).toLocaleString('en-US')}</td>
            <td className="text-right tabular-nums">{e.treadMm === null ? '—' : num(e.treadMm)}</td>
            <td className="text-xs">{e.reasonCode ?? ''}</td><td className="text-xs">{e.destination ?? ''}</td><td className="text-right tabular-nums">{num(e.cost) ? money(e.cost) : ''}</td>
          </tr>
        ))}</tbody>
      </table>
    )
  )

  return (
    <FormLayout
      title={current?.serialNo ?? `${t('common.new')} ${t('nav.tireProfiles')}`}
      subtitle={current ? [current.brandCode, current.sizeCode].filter(Boolean).join(' · ') : undefined}
      tabs={[
        { id: 'general', label: t('form.general'), content: general },
        { id: 'mileage', label: t('tyre.tab.mileage'), content: mileage },
        { id: 'purchase', label: t('tyre.tab.purchase'), content: purchase },
        { id: 'install', label: t('tyre.tab.install'), content: install },
        ...(current ? [{ id: 'history', label: t('tyre.tab.history'), content: history }] : []),
      ]}
      isNew={!current}
      actions={
        <div className="flex gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
          {editable && <ToolbarButton tone="primary" disabled={save.isPending} onClick={persist}>{save.isPending ? t('common.loading') : t('common.save')}</ToolbarButton>}
        </div>
      }
    />
  )
}
