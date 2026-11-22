'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { RechargeLinesTable, RechargePreviewDialog } from '@/components/recharges/RechargePreviewDialog'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { needsTaxInvoice, useSubconTaxInvoice } from '@/lib/api/platform/subconDeductionInvoices'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  RECHARGE_STATUSES, modeClass, rechargeActions, statusClass, useRecharge, useRechargeCandidates, useRechargeMutations, useRecharges,
  type RechargeCandidate, type RechargeDto,
} from '@/lib/api/fleet/recharges'

const BASE = '/fleet/recharges'
const cand = createColumnHelper<RechargeCandidate>()
const rel = createColumnHelper<RechargeDto>()
const badge = (cls: string, text: string) => <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>
const filterCls = 'text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

/** New page (prompt 12 §C), the Work Orders list look: "To release" and "Released" tabs. */
export function RechargesView({ tab, status, mode, billTo }: { tab: string; status: string; mode: string; billTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const push = (p: Record<string, string>) => {
    const sp = new URLSearchParams({ tab, status, mode, billTo, ...p })
    for (const [k, v] of [...sp.entries()]) if (!v || v === 'ALL') sp.delete(k)
    router.push(`${BASE}?${sp.toString()}`)
  }
  const released = tab === 'released'
  return (
    <ListPage
      title={t('nav.recharges')}
      subtitle={released ? t('recharge.releasedHint') : t('recharge.toReleaseHint')}
      filters={
        <>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden self-end">
            {(['release', 'released'] as const).map((x) => (
              <button key={x} type="button" onClick={() => push({ tab: x })} className={`px-4 py-2 text-sm font-medium ${(x === 'released') === released ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {t(x === 'release' ? 'recharge.toRelease' : 'recharge.releasedTab')}
              </button>
            ))}
          </div>
          {released && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
                <select value={status || 'ALL'} onChange={(e) => push({ status: e.target.value })} className={filterCls}>
                  <option value="ALL">{t('common.all')}</option>
                  {RECHARGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{t('recharge.mode')}</label>
                <select value={mode || 'ALL'} onChange={(e) => push({ mode: e.target.value })} className={filterCls}>
                  <option value="ALL">{t('common.all')}</option><option value="INVOICE">INVOICE</option><option value="DEDUCTION">DEDUCTION</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{t('recharge.billTo')}</label>
                <input defaultValue={billTo} onKeyDown={(e) => { if (e.key === 'Enter') push({ billTo: (e.target as HTMLInputElement).value.trim().toUpperCase() }) }} placeholder="Party code ↵" className={`${filterCls} w-40 uppercase`} />
              </div>
            </>
          )}
        </>
      }
    >
      {released ? <ReleasedTab status={status} mode={mode} billTo={billTo} /> : <ToReleaseTab />}
    </ListPage>
  )
}

function ToReleaseTab() {
  const { t } = useT()
  const { currentBranchId } = useBranchContext()
  const { canAt } = useFleetAccess()
  const list = useRechargeCandidates(currentBranchId ?? null)
  const [open, setOpen] = useState<RechargeCandidate | null>(null)
  const columns = [
    cand.display({ id: 'wo', header: 'WO No / Equipment', cell: ({ row: { original: c } }) => <div className="flex flex-col gap-0.5"><Link href={`/fleet/work-orders/${c.workOrderId}`} className="text-blue-600 hover:underline font-mono text-sm">{c.workOrderNo}</Link><span className="text-xs text-gray-400 font-mono">{c.assetCode}</span></div> }),
    cand.display({ id: 'date', header: () => t('common.date'), cell: ({ row: { original: c } }) => <div className="flex flex-col gap-0.5"><span className="text-sm">{fmtDate(c.documentDate)}</span><span className="text-xs text-gray-400">{c.status}</span></div> }),
    cand.display({ id: 'billto', header: () => t('recharge.defaultBillTo'), cell: ({ row: { original: c } }) => <span className="text-sm font-mono">{c.defaultBillToPartyCode ?? '—'}</span> }),
    cand.display({ id: 'lines', header: () => t('recharge.billable'), cell: ({ row: { original: c } }) => <div className="flex flex-col gap-0.5 text-right"><span className="text-sm">{Number(c.billableLines)} {t('docs.lines')}</span><span className="text-xs text-gray-400">{t('recharge.cost')} {money(c.costAmount)}</span></div> }),
    cand.display({ id: 'act', header: '', size: 140, cell: ({ row: { original: c } }) => canAt('fleet.recharge.release', c.branchId) && <button type="button" onClick={() => setOpen(c)} className="text-xs text-blue-600 hover:underline">{t('recharge.previewRelease')}</button> }),
  ]
  return (
    <>
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={list.data ?? []} columns={columns} pageSize={15} />}
      {open && <RechargePreviewDialog workOrderId={open.workOrderId} workOrderNo={open.workOrderNo} onClose={() => setOpen(null)} />}
    </>
  )
}

function ReleasedTab({ status, mode, billTo }: { status: string; mode: string; billTo: string }) {
  const { t } = useT()
  const toast = useToastStore()
  const { canAt } = useFleetAccess()
  const list = useRecharges({ status: status || undefined, mode: mode || undefined, billToPartyCode: billTo || undefined })
  const { act } = useRechargeMutations()
  const [detail, setDetail] = useState<string | null>(null)
  const [cancel, setCancel] = useState<RechargeDto | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const run = (r: RechargeDto, action: 'retry' | 'refresh') =>
    act.mutate({ id: r.rechargeId, action }, { onSuccess: (x) => toast.success(t('docs.done'), `${x.rechargeNo} · ${x.status}`), onError: (e) => toast.error(t('common.saveFailed'), errorText(e, t)) })
  const columns = [
    rel.display({ id: 'no', header: 'Recharge No / WO No', cell: ({ row: { original: r } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => setDetail(r.rechargeId)} className="text-blue-600 hover:underline text-left font-mono text-sm">{r.rechargeNo}</button><Link href={`/fleet/work-orders/${r.workOrderId}`} className="text-xs text-gray-500 hover:underline font-mono">{r.workOrderNo}</Link></div> }),
    rel.display({ id: 'billto', header: () => t('recharge.billToMode'), cell: ({ row: { original: r } }) => <div className="flex flex-col gap-1 items-start"><span className="text-sm font-medium">{r.billToName ?? r.billToPartyCode}</span>{badge(modeClass(r.rechargeMode), r.rechargeMode)}</div> }),
    rel.display({ id: 'parts', header: 'Labour / Parts / Sublet / Sundry', cell: ({ row: { original: r } }) => <div className="grid grid-cols-2 gap-x-3 text-xs tabular-nums"><span>L {money(r.laborAmount)}</span><span>P {money(r.partsAmount)}</span><span>S {money(r.subletAmount)}</span><span>Su {money(r.sundryAmount)}</span></div> }),
    rel.display({ id: 'amt', header: 'Net / VAT / Total', cell: ({ row: { original: r } }) => <div className="flex flex-col text-right text-xs tabular-nums"><span>{money(r.netAmount)}</span><span className="text-gray-400">{money(r.taxAmount)}</span><span className="text-sm font-semibold">{money(r.totalAmount)}</span></div> }),
    rel.display({
      id: 'status', header: () => t('common.status'), size: 170,
      cell: ({ row: { original: r } }) => {
        const a = rechargeActions(r.status)
        const can = canAt('fleet.recharge.release', r.branchId)
        return (
          <div className="flex flex-col gap-1 items-start">
            {badge(statusClass(r.status), r.status)}
            {r.status === 'FAILED' && r.deliveryError && <span className="text-[11px] text-red-600 max-w-[14rem]">{r.deliveryError}</span>}
            {r.externalRef && <span className="text-[11px] text-gray-500 font-mono">{r.externalRef}</span>}
            {can && (
              <div className="flex gap-2">
                {a.retry && <button type="button" disabled={act.isPending} onClick={() => run(r, 'retry')} className="text-xs text-blue-600 hover:underline">{t('recharge.retry')}</button>}
                {a.refresh && <button type="button" disabled={act.isPending} onClick={() => run(r, 'refresh')} className="text-xs text-blue-600 hover:underline">{t('recharge.refresh')}</button>}
                {a.cancel && <button type="button" onClick={() => { setCancelError(null); setCancel(r) }} className="text-xs text-red-500 hover:underline">{t('docs.action.cancel')}</button>}
              </div>
            )}
          </div>
        )
      },
    }),
  ]
  return (
    <>
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={list.data ?? []} columns={columns} pageSize={15} />}
      {detail && <RechargeDrawer id={detail} onClose={() => setDetail(null)} />}
      {cancel && (
        <ReasonDialog
          title={`${t('docs.action.cancel')} · ${cancel.rechargeNo}`}
          confirmLabel={t('docs.action.cancel')}
          reasonRequired
          danger
          hint={t('recharge.cancelHint')}
          busy={act.isPending}
          error={cancelError}
          onConfirm={(reason) => act.mutate({ id: cancel.rechargeId, action: 'cancel', body: { reason, rowVersion: cancel.rowVersion } }, {
            onSuccess: () => { toast.success(t('docs.done')); setCancel(null) },
            onError: (e) => setCancelError(errorText(e, t)),
          })}
          onClose={() => setCancel(null)}
        />
      )}
    </>
  )
}

function RechargeDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useT()
  const r = useRecharge(id)
  const d = r.data
  // SCT tax invoice of a deducted subcontractor recharge (prompt 23): issued when Trucking marks the statement PAID.
  const taxInv = useSubconTaxInvoice(d?.rechargeNo, needsTaxInvoice(d))
  return (
    <Panel open title={d ? `${d.rechargeNo} · ${d.workOrderNo}` : t('common.loading')} onClose={onClose} footer={<div />}>
      {r.isLoading ? <Loading /> : r.error ? <Alert>{errorText(r.error, t)}</Alert> : d && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-500">{t('recharge.billTo')}</p><p className="font-medium">{d.billToName ?? d.billToPartyCode}</p><p className="text-xs font-mono text-gray-500">{d.billToPartyCode}</p></div>
            <div className="flex flex-col gap-1 items-start"><p className="text-xs text-gray-500">{t('recharge.mode')} / {t('common.status')}</p>{badge(modeClass(d.rechargeMode), d.rechargeMode)}{badge(statusClass(d.status), d.status)}</div>
            <div><p className="text-xs text-gray-500">{t('tariff.cardUsed')}</p><p className="font-mono">{d.rateCardCode ?? '—'}</p></div>
            <div><p className="text-xs text-gray-500">{t('recharge.externalRef')}</p><p className="font-mono">{d.externalRef ?? '—'}</p></div>
            <div><p className="text-xs text-gray-500">{t('recharge.releasedAt')}</p><p>{fmtDate(d.releasedAt)}</p></div>
            <div><p className="text-xs text-gray-500">{t('recharge.delivered')}</p><p>{d.deliveredAt ? fmtDate(d.deliveredAt) : '—'} · {Number(d.deliveryAttempts)}×</p></div>
            {needsTaxInvoice(d) && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">{t('recharge.taxInvoice')}</p>
                {taxInv.isLoading ? <p className="text-gray-400">…</p> : taxInv.data ? (
                  <p className="font-mono">{taxInv.data.invoiceNo} <span className="font-sans text-xs text-gray-500">· {taxInv.data.settlementNo} · {fmtDate(taxInv.data.settledAt)}</span></p>
                ) : <p className="text-xs text-gray-500">{taxInv.error ? errorText(taxInv.error, t) : t('recharge.taxInvoicePending')}</p>}
              </div>
            )}
          </div>
          {d.deliveryError && <Alert>{d.deliveryError}</Alert>}
          {d.cancelReason && <p className="text-xs text-gray-600">{t('docs.action.cancel')}: {d.cancelReason}</p>}
          <RechargeLinesTable lines={d.lines} />
          <div className="grid grid-cols-3 gap-2 text-right border-t pt-2">
            <div><p className="text-xs text-gray-500">Net</p><p>{money(d.netAmount)}</p></div>
            <div><p className="text-xs text-gray-500">VAT</p><p>{money(d.taxAmount)}</p></div>
            <div><p className="text-xs text-gray-500">Total</p><p className="font-semibold">{money(d.totalAmount)}</p></div>
          </div>
        </div>
      )}
    </Panel>
  )
}
