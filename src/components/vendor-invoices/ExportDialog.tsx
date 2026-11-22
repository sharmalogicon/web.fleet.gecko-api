'use client'

import { useState } from 'react'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  exportFile, useCreateExport, useExportHistory, usePendingExports, type ApExportBatchDto,
} from '@/lib/api/fleet/vendorInvoices'
import {
  RECON_RESULTS, batchHasFailures, batchResults, useErpConnection, useErpReconciliation, useExportBatch, usePullErpPayments, useRetryExport,
  type ErpPaymentPullDto,
} from '@/lib/api/fleet/erp'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { openFile } from '@/lib/api/client'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'

type Tab = 'pending' | 'history' | 'payments' | 'recon'
type Target = 'CSV' | 'SAP_B1'

const RESULT_TONE: Record<string, string> = {
  OK: '',
  TOTAL_DIFFERS: 'bg-amber-50 text-amber-800',
  PAID_DIFFERS: 'bg-amber-50 text-amber-800',
  MISSING_IN_SAP: 'bg-red-50 text-red-700',
}

async function downloadBatch(b: ApExportBatchDto, onError: (e: unknown) => void) {
  try {
    openFile(await exportFile(b.exportBatchId), true)
  } catch (e) {
    onError(e)
  }
}

/** A batch: counts / totals, and for SAP each document's DocNum (green) or error (red); Retry failed; CSV download. */
function BatchView({ batch, onRetried }: { batch: ApExportBatchDto; onRetried: (b: ApExportBatchDto) => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const retry = useRetryExport()
  const fail = (e: unknown) => toast.error(t('common.saveFailed'), errorText(e, t))
  const docs = batchResults(batch)
  return (
    <div className="flex flex-col gap-2 text-sm text-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium font-mono">{batch.batchNo}</span>
        <span className="text-xs px-1.5 rounded bg-gray-100">{t(`vinv.export.target.${batch.target}`)}</span>
        <span className={`text-xs px-1.5 rounded ${batch.status === 'SENT' ? 'bg-green-50 text-green-700' : batch.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{batch.status}</span>
        {batch.attachmentId && <button type="button" onClick={() => downloadBatch(batch, fail)} className="text-xs text-blue-600 hover:underline">{t('vinv.export.csv')}</button>}
        {batchHasFailures(batch) && (
          <Button busy={retry.isPending} onClick={() => retry.mutate(batch.exportBatchId, {
            onSuccess: (b) => { toast.success(t('erp.retried'), b.batchNo); onRetried(b) }, onError: fail,
          })}>{t('erp.retryFailed')}</Button>
        )}
      </div>
      <p>{t('vinv.export.invoices')}: {batch.invoiceCount} · {money(batch.invoiceTotal)} · {t('vinv.export.creditNotes')}: {batch.creditNoteCount} · {money(batch.creditTotal)}</p>
      {batch.errorText && <p className="text-red-600">{batch.errorText}</p>}
      {batch.target === 'SAP_B1' && docs.length > 0 && (
        <table className="w-full text-xs mt-1">
          <thead><tr className="text-left text-gray-500"><th className="py-1 pr-3">Document</th><th className="py-1 pr-3">Supplier</th><th className="py-1 pr-3 text-right">Amount</th><th className="py-1">SAP</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.documentId} className="border-t border-gray-100">
                <td className="py-1 pr-3 font-mono">{d.documentNo}<div className="text-gray-400">{t(`vinv.export.docType.${d.docType}`)}</div></td>
                <td className="py-1 pr-3">{d.supplierName}</td>
                <td className="py-1 pr-3 text-right">{money(d.amount)}</td>
                <td className="py-1">{d.posted ? <span className="text-green-700 font-mono">DocNum {d.erpDocNum}</span> : <span className="text-red-600">{d.erpError ?? t('erp.notPosted')}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/**
 * Export to accounting (prompt 15 §E + prompt 17 §B, §C): ready documents → CSV file or SAP Business One;
 * earlier batches (retry failed SAP documents); pull SAP payments; reconcile with SAP.
 */
export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const { current } = useBranchContext()
  const { canTenantWide } = useFleetAccess()
  const canSetup = canTenantWide('fleet.setup.manage')
  const conn = useErpConnection(canSetup)
  // Without setup rights both targets are offered; the API answers 409 when there is no active connection.
  const sapAvailable = !canSetup || (!!conn.data && conn.data.isActive)
  const [tab, setTab] = useState<Tab>('pending')
  const [target, setTarget] = useState<Target>('CSV')
  const pending = usePendingExports(current?.branchId ?? null, tab === 'pending')
  const history = useExportHistory({}, tab === 'history')
  const create = useCreateExport()
  const pull = usePullErpPayments()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<ApExportBatchDto | null>(null)
  const [openBatchId, setOpenBatchId] = useState<string | null>(null)
  const opened = useExportBatch(openBatchId)
  const [since, setSince] = useState('')
  const [pulled, setPulled] = useState<ErpPaymentPullDto | null>(null)
  const [recon, setRecon] = useState<{ from: string; to: string } | null>(null)
  const [reconForm, setReconForm] = useState({ from: '', to: '' })
  const reconRows = useErpReconciliation({ from: recon?.from || undefined, to: recon?.to || undefined }, tab === 'recon' && !!recon)
  const docs = pending.data ?? []
  const fail = (e: unknown) => toast.error(t('common.saveFailed'), errorText(e, t))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const run = () => {
    const chosen = docs.filter((d) => picked.has(d.documentId))
    const ids = (type: string) => (picked.size ? chosen.filter((d) => d.docType === type).map((d) => d.documentId) : null)
    create.mutate(
      { invoiceIds: ids('INVOICE'), creditNoteIds: ids('CREDIT_NOTE'), branchId: current?.branchId ?? null, target },
      { onSuccess: (b) => { setBatch(b); setPicked(new Set()); toast.success(t('vinv.export.done'), b.batchNo) }, onError: fail },
    )
  }

  const tabs: Tab[] = ['pending', 'history', 'payments', 'recon']
  const input = 'rounded-lg border border-gray-300 px-2 py-1 text-sm'

  return (
    <Panel
      open
      variant="modal"
      title={t('vinv.export.title')}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.close')}</Button>
          {tab === 'pending' && (batch ? (
            <>
              {batch.attachmentId && <Button variant="primary" onClick={() => downloadBatch(batch, fail)}>{t('vinv.export.csv')}</Button>}
              <Button onClick={() => setBatch(null)}>{t('erp.backToPending')}</Button>
            </>
          ) : (
            <Button variant="primary" busy={create.isPending} disabled={!docs.length} onClick={run}>
              {picked.size ? `${t('vinv.export.run')} (${picked.size})` : t('vinv.export.runAll')}
            </Button>
          ))}
        </>
      )}
    >
      <div className="flex gap-2 border-b border-gray-200 -mt-1">
        {tabs.map((k) => (
          <button key={k} type="button" onClick={() => { setTab(k); setOpenBatchId(null) }}
            className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${tab === k ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-gray-500'}`}>
            {t(`vinv.export.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'pending' && (batch ? <BatchView batch={batch} onRetried={setBatch} /> : (
        <>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-xs font-medium text-gray-600">{t('erp.target')}</span>
            {(['CSV', 'SAP_B1'] as const).map((tg) => (
              <label key={tg} className={`flex items-center gap-1.5 ${tg === 'SAP_B1' && !sapAvailable ? 'opacity-50' : ''}`}
                title={tg === 'SAP_B1' && !sapAvailable ? t('erp.noActiveConnection') : undefined}>
                <input type="radio" name="export-target" checked={target === tg} disabled={tg === 'SAP_B1' && !sapAvailable} onChange={() => setTarget(tg)} />
                {t(`vinv.export.target.${tg}`)}
              </label>
            ))}
          </div>
          {pending.isLoading ? <Loading /> : pending.error ? <Alert>{errorText(pending.error, t)}</Alert> : docs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t('vinv.export.none')}</p>
          ) : (
            <div className="overflow-x-auto max-h-[45vh]">
              <p className="text-xs text-gray-500 mb-2">{t('vinv.export.hint')}</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-2" /><th className="py-1 pr-3">Type</th><th className="py-1 pr-3">Document</th>
                    <th className="py-1 pr-3">Supplier</th><th className="py-1 pr-3">Date</th><th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.documentId} className="border-t border-gray-100">
                      <td className="py-1 pr-2"><input type="checkbox" checked={picked.has(d.documentId)} onChange={() => toggle(d.documentId)} /></td>
                      <td className="py-1 pr-3">{t(`vinv.export.docType.${d.docType}`)}</td>
                      <td className="py-1 pr-3 font-mono">{d.documentNo}<div className="text-gray-400">{d.supplierDocNo}</div>{d.erpError && <div className="text-red-600 font-sans">{d.erpError}</div>}</td>
                      <td className="py-1 pr-3">{d.supplierName}</td>
                      <td className="py-1 pr-3">{fmtDate(d.documentDate)}</td>
                      <td className="py-1 text-right">{money(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ))}

      {tab === 'history' && (openBatchId ? (
        opened.isLoading ? <Loading /> : opened.error || !opened.data ? <Alert>{errorText(opened.error, t)}</Alert> : (
          <>
            <button type="button" onClick={() => setOpenBatchId(null)} className="text-xs text-blue-600 hover:underline self-start">← {t('vinv.export.tab.history')}</button>
            <BatchView batch={opened.data} onRetried={() => opened.refetch()} />
          </>
        )
      ) : history.isLoading ? <Loading /> : history.error ? <Alert>{errorText(history.error, t)}</Alert> : (
        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-3">Batch</th><th className="py-1 pr-3">Exported</th><th className="py-1 pr-3">Target</th>
                <th className="py-1 pr-3 text-right">Invoices</th><th className="py-1 pr-3 text-right">Credit notes</th><th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((b) => (
                <tr key={b.exportBatchId} className={`border-t border-gray-100 ${batchHasFailures(b) ? 'bg-red-50' : ''}`}>
                  <td className="py-1 pr-3 font-mono">
                    <button type="button" onClick={() => setOpenBatchId(b.exportBatchId)} className="text-blue-600 hover:underline">{b.batchNo}</button>
                    <div className="text-gray-400 font-sans">{b.status}</div>
                  </td>
                  <td className="py-1 pr-3">{fmtDate(b.exportedAt)}</td>
                  <td className="py-1 pr-3">{t(`vinv.export.target.${b.target}`)}</td>
                  <td className="py-1 pr-3 text-right">{b.invoiceCount} · {money(b.invoiceTotal)}</td>
                  <td className="py-1 pr-3 text-right">{b.creditNoteCount} · {money(b.creditTotal)}</td>
                  <td className="py-1 text-right">
                    {b.attachmentId && <button type="button" onClick={() => downloadBatch(b, fail)} className="text-blue-600 hover:underline">CSV</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === 'payments' && (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-gray-600">{t('erp.pullHint')}</p>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">{t('erp.since')}
              <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className={input} />
            </label>
            <Button variant="primary" busy={pull.isPending}
              onClick={() => pull.mutate(since || undefined, { onSuccess: (r) => { setPulled(r); toast.success(t('erp.pulled'), String(r.rowsRecorded)) }, onError: fail })}>
              {t('erp.pull')}
            </Button>
          </div>
          {pulled && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-1">
              <p>{t('erp.paymentsRead')}: {pulled.paymentsRead} · {t('erp.rowsRecorded')}: {pulled.rowsRecorded} · {t('erp.invoicesPaid')}: {pulled.invoicesPaid}</p>
              <p className="text-xs text-gray-500">{t('erp.syncedAt')}: {new Date(pulled.syncedAt).toLocaleString('en-GB')}</p>
              {pulled.unmatched?.length > 0 && (
                <div className="text-amber-700 text-xs">
                  <p className="font-medium">{t('erp.unmatched')}:</p>
                  <ul className="list-disc ml-4">{pulled.unmatched.map((u, i) => <li key={i}>{typeof u === 'string' ? u : JSON.stringify(u)}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'recon' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">{t('common.from')}
              <input type="date" value={reconForm.from} onChange={(e) => setReconForm({ ...reconForm, from: e.target.value })} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">{t('common.to')}
              <input type="date" value={reconForm.to} onChange={(e) => setReconForm({ ...reconForm, to: e.target.value })} className={input} />
            </label>
            <Button variant="primary" busy={reconRows.isFetching} onClick={() => setRecon({ ...reconForm })}>{t('erp.reconcile')}</Button>
          </div>
          {!recon ? <p className="text-sm text-gray-400">{t('erp.reconHint')}</p>
            : reconRows.isLoading ? <Loading /> : reconRows.error ? <Alert>{errorText(reconRows.error, t)}</Alert> : (
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1 pr-3">Document</th><th className="py-1 pr-3">SAP DocNum</th><th className="py-1 pr-3 text-right">Gecko total</th>
                      <th className="py-1 pr-3 text-right">SAP total</th><th className="py-1 pr-3 text-right">Gecko paid</th><th className="py-1 pr-3 text-right">SAP paid</th><th className="py-1">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reconRows.data ?? []).length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-400">{t('report.noRows')}</td></tr>}
                    {(reconRows.data ?? []).map((r) => (
                      <tr key={`${r.docType}:${r.documentId}`} className={`border-t border-gray-100 ${RESULT_TONE[r.result] ?? ''}`}>
                        <td className="py-1 pr-3 font-mono">{r.documentNo}<div className="text-gray-400 font-sans">{t(`vinv.export.docType.${r.docType}`)} · {r.supplierPartyCode} · {r.supplierDocNo ?? ''}</div></td>
                        <td className="py-1 pr-3 font-mono">{r.erpDocNum ?? '—'}</td>
                        <td className="py-1 pr-3 text-right">{money(r.geckoTotal)}</td>
                        <td className="py-1 pr-3 text-right">{money(r.sapTotal)}</td>
                        <td className="py-1 pr-3 text-right">{money(r.geckoPaid)}</td>
                        <td className="py-1 pr-3 text-right">{money(r.sapPaid)}</td>
                        <td className="py-1 font-medium">{(RECON_RESULTS as readonly string[]).includes(r.result) ? t(`erp.recon.${r.result}`) : r.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
    </Panel>
  )
}
