'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { Field, inputClass } from '@/components/shared/FormField'
import { ToolbarButton } from '@/components/shared/ReasonDialog'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, fmtDate, money, num, useSaveFailure } from '@/components/docs/DocBits'
import { TyreStatusBadges } from '@/components/tire-profiles/TyreProfileViews'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'
import { useTyreMutations, useTyres, type TyreDto, type TyreWithLastEvent } from '@/lib/api/fleet/tyres'

const col = createColumnHelper<TyreDto>()
export const RECAP_TABS = ['AT_RECAP', 'AWAITING_REPAIR'] as const
const BASE = '/fleet/tires/pending-recap'

/** `/fleet/tires/pending-recap` = tyres AT_RECAP (or AWAITING_REPAIR via the status filter), prompt 13 §D. */
export function PendingRecapView({ serialNo, brand, status }: { serialNo: string; brand: string; status: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAnywhere } = useFleetAccess()
  const st = (RECAP_TABS as readonly string[]).includes(status) ? status : 'AT_RECAP'
  const list = useTyres({ status: st, search: serialNo || undefined })
  const b = brand.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) => !b || (d.brandCode ?? '').toUpperCase().includes(b))
  const [receiving, setReceiving] = useState<{ tyre: TyreDto; action: 'RECEIVE_RECAP' | 'REPAIR' } | null>(null)
  const push = (p: Record<string, string>) => {
    const sp = new URLSearchParams({ serialNo, brand, status: st, ...p })
    for (const [k, v] of [...sp.entries()]) if (!v) sp.delete(k)
    router.push(`${BASE}?${sp.toString()}`)
  }
  const columns = [
    col.display({ id: 'serial', header: 'Serial / Size', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => router.push(`/fleet/tires/profiles/${d.tyreId}`)} className="text-blue-600 hover:underline text-left font-mono text-sm">{d.serialNo}</button><span className="text-xs text-gray-400">{d.sizeCode ?? '—'}</span></div> }),
    col.display({ id: 'brand', header: 'Brand / Condition', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{d.brandCode ?? '—'} {d.modelName ?? ''}</span><span className="text-xs text-gray-400">{d.condition ?? '—'}</span></div> }),
    col.display({ id: 'recap', header: t('tyre.recapsTread'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm tabular-nums">{num(d.recapCount)}×</span><span className="text-xs text-gray-400">{d.currentTreadMm === null ? '—' : `${num(d.currentTreadMm)} mm`}</span></div> }),
    col.display({ id: 'sent', header: t('tyre.sentVendor'), cell: ({ row: { original: d } }) => { const l = d as TyreWithLastEvent; return <div className="flex flex-col gap-0.5"><span className="text-sm font-mono">{l.lastDocumentNo ?? '—'}</span><span className="text-xs text-gray-400">{l.lastEventAt ? fmtDate(l.lastEventAt) : ''}{l.lastPartyCode ? ` · ${l.lastPartyCode}` : ''}</span></div> } }),
    col.display({ id: 'status', header: 'Status / Cost', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1"><TyreStatusBadges d={d} /><span className="text-xs text-gray-500">{money(d.status === 'AWAITING_REPAIR' ? d.repairCostTotal : d.recapCostTotal)}</span></div> }),
    col.display({
      id: 'act', header: '', size: 150,
      cell: ({ row: { original: d } }) => canAnywhere('fleet.tyre.manage') && (
        d.status === 'AT_RECAP' ? <button type="button" onClick={() => setReceiving({ tyre: d, action: 'RECEIVE_RECAP' })} className="text-xs text-blue-600 hover:underline">{t('tyre.receiveRecap')}</button>
        : d.status === 'AWAITING_REPAIR' ? <button type="button" onClick={() => setReceiving({ tyre: d, action: 'REPAIR' })} className="text-xs text-blue-600 hover:underline">{t('tyre.repaired')}</button>
        : null
      ),
    }),
  ]
  return (
    <ListPage
      title={t('nav.pendingRecap')}
      subtitle={`${rows.length} tyre${rows.length !== 1 ? 's' : ''} found`}
      filters={
        <>
          <input defaultValue={serialNo} placeholder="Serial no ↵" onKeyDown={(e) => { if (e.key === 'Enter') push({ serialNo: (e.target as HTMLInputElement).value.trim() }) }} className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-44 self-end" />
          <input defaultValue={brand} placeholder="Brand ↵" onKeyDown={(e) => { if (e.key === 'Enter') push({ brand: (e.target as HTMLInputElement).value.trim() }) }} className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-36 self-end" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
            <select value={st} onChange={(e) => push({ status: e.target.value })} className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
              {RECAP_TABS.map((s) => <option key={s} value={s}>{t(`tyre.status.${s}`)}</option>)}
            </select>
          </div>
        </>
      }
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
      {receiving && <ReceiveRecapDialog tyre={receiving.tyre} action={receiving.action} onClose={() => setReceiving(null)} />}
    </ListPage>
  )
}

/**
 * "Receive from recap" = POST /tyre-maintenance with one RECEIVE_RECAP line (type RECAP, recap count + 1, new tread);
 * "Repaired" (AWAITING_REPAIR, owner answer 13 Q3) = one REPAIR line.
 */
function ReceiveRecapDialog({ tyre, action, onClose }: { tyre: TyreDto; action: 'RECEIVE_RECAP' | 'REPAIR'; onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { currentBranchId } = useBranchContext()
  const { maintenance } = useTyreMutations()
  const [tread, setTread] = useState('')
  const [cost, setCost] = useState('')
  const [supplier, setSupplier] = useState((tyre as TyreWithLastEvent).lastPartyCode ?? '')
  const repair = action === 'REPAIR'
  const [vat, setVat] = useState('7')
  const [error, setError] = useState<string | null>(null)
  const submit = () => {
    setError(null)
    if (!repair && !tread.trim()) { setError(t('tyre.rule.newTread')); return }
    maintenance.mutate({
      branchId: currentBranchId ?? tyre.branchId, supplierPartyCode: supplier.trim() || null, taxRate: Number(vat || 0),
      lines: [{ action, tyreId: tyre.tyreId, treadMm: tread.trim() ? Number(tread) : null, cost: Number(cost || 0) }],
    }, {
      onSuccess: (doc) => { toast.success(t('tireMap.posted'), doc.documentNo); onClose() },
      onError: (e) => setError(failure(e)),
    })
  }
  return (
    <Panel
      open
      variant="modal"
      title={`${repair ? t('tyre.repaired') : t('tyre.receiveRecap')} · ${tyre.serialNo}`}
      onClose={onClose}
      footer={<div className="flex justify-end gap-2"><ToolbarButton onClick={onClose}>{t('common.cancel')}</ToolbarButton><ToolbarButton tone="primary" disabled={maintenance.isPending} onClick={submit}>{t('docs.action.post')}</ToolbarButton></div>}
    >
      <div className="grid grid-cols-2 gap-3 min-w-[min(28rem,85vw)]">
        {error && <div className="col-span-2"><Alert>{error}</Alert></div>}
        <Field label={repair ? t('tyre.tread') : `${t('tyre.newTread')} *`}><input type="number" step="0.1" value={tread} onChange={(e) => setTread(e.target.value)} className={inputClass()} /></Field>
        <Field label={repair ? t('tyre.repairCost') : t('tyre.recapCost')}><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass()} /></Field>
        <Field label={t('form.vendor')}><SupplierCodeInput id="rr-supplier" value={supplier} onChange={setSupplier} className={inputClass()} /></Field>
        <Field label="VAT (%)"><input type="number" step="0.01" value={vat} onChange={(e) => setVat(e.target.value)} className={inputClass()} /></Field>
      </div>
    </Panel>
  )
}
