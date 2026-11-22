'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound, useSearchParams } from 'next/navigation'
import { ListPage } from '@/components/shared/ListPage'
import { Button, Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  exportFile, groupUnbilled, lineFromUnbilled, newInvoiceForm, toFormValues, toRow, unbilledKey, useCreateExport, useExportHistory,
  usePendingExports, useUnbilled, useVendorInvoice, useVendorInvoices, type ApExportBatchDto,
} from '@/lib/api/fleet/vendorInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useBranchContext } from '@/lib/api/platform/branches'
import { openFile } from '@/lib/api/client'
import { ApiError } from '@/lib/api/problem'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { UnbilledInvoiceClient } from './UnbilledInvoiceClient'
import { UnbilledInvoiceFilters } from './UnbilledInvoiceFilters'
import { VendorInvoiceFilters } from './VendorInvoiceFilters'
import { VendorInvoiceListClient } from './VendorInvoiceListClient'
import { VendorInvoiceFormClient } from './VendorInvoiceFormClient'

// ── A. unbilled ─────────────────────────────────────────────────────────────
export function UnbilledListView(p: { vendorName: string; poNo: string; grNo: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  // One API `search` (document, PO, supplier…): the first box that is filled.
  const list = useUnbilled({ search: p.grNo || p.poNo || p.vendorName || undefined, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  const rows = groupUnbilled(list.data ?? [])
  return (
    <ListPage
      title={t('nav.unbilledInvoices')}
      subtitle={`${rows.length} unbilled item${rows.length !== 1 ? 's' : ''} found`}
      filters={<UnbilledInvoiceFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : (
        <UnbilledInvoiceClient data={rows} canCreate={canAnywhere('fleet.vendorinvoice.manage')} />
      )}
    </ListPage>
  )
}

// ── B. invoices ─────────────────────────────────────────────────────────────
interface ListProps {
  documentNo: string
  customerName: string
  vendorInvoiceNo: string
  status: string
  dateFrom: string
  dateTo: string
}

export function VendorInvoicesListView(p: ListProps) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const [exporting, setExporting] = useState(false)
  const list = useVendorInvoices({
    search: p.documentNo || p.vendorInvoiceNo || p.customerName || undefined, status: p.status && p.status !== 'ALL' ? p.status : undefined,
    from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toRow)
  return (
    <ListPage
      title={t('nav.vendorInvoices')}
      subtitle={`${rows.length} invoice${rows.length !== 1 ? 's' : ''} found`}
      actions={
        <div className="flex items-center gap-2">
          {canAnywhere('fleet.vendorinvoice.export') && (
            <button type="button" onClick={() => setExporting(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              {t('vinv.export.button')}
            </button>
          )}
          {canAnywhere('fleet.vendorinvoice.manage') && (
            <Link href="/invoice/vendor/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              + {t('nav.vendorInvoices')}
            </Link>
          )}
        </div>
      }
      filters={<VendorInvoiceFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <VendorInvoiceListClient data={rows} />}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </ListPage>
  )
}

async function downloadBatch(b: ApExportBatchDto, onError: (e: unknown) => void) {
  try {
    openFile(await exportFile(b.exportBatchId), true)
  } catch (e) {
    onError(e)
  }
}

/** §E: approved, not yet exported invoices + credit notes → tick → batch → CSV. A second tab lists earlier batches. */
function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const toast = useToastStore()
  const { current } = useBranchContext()
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const pending = usePendingExports(current?.branchId ?? null, tab === 'pending')
  const history = useExportHistory({}, tab === 'history')
  const create = useCreateExport()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<ApExportBatchDto | null>(null)
  const docs = pending.data ?? []
  const fail = (e: unknown) => toast.error(t('common.saveFailed'), errorText(e, t))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const run = () => {
    const chosen = docs.filter((d) => picked.has(d.documentId))
    const ids = (type: string) => (picked.size ? chosen.filter((d) => d.docType === type).map((d) => d.documentId) : null)
    create.mutate(
      { invoiceIds: ids('INVOICE'), creditNoteIds: ids('CREDIT_NOTE'), branchId: current?.branchId ?? null },
      { onSuccess: (b) => { setBatch(b); toast.success(t('vinv.export.done'), b.batchNo) }, onError: fail },
    )
  }

  return (
    <Panel
      open
      variant="modal"
      title={t('vinv.export.title')}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('common.close')}</Button>
          {batch ? (
            <Button variant="primary" onClick={() => downloadBatch(batch, fail)}>{t('vinv.export.csv')}</Button>
          ) : tab === 'pending' && (
            <Button variant="primary" busy={create.isPending} disabled={!docs.length} onClick={run}>
              {picked.size ? `${t('vinv.export.run')} (${picked.size})` : t('vinv.export.runAll')}
            </Button>
          )}
        </>
      )}
    >
      <div className="flex gap-2 border-b border-gray-200 -mt-1">
        {(['pending', 'history'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${tab === k ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-gray-500'}`}>
            {t(`vinv.export.tab.${k}`)}
          </button>
        ))}
      </div>
      {batch ? (
        <div className="text-sm text-gray-700 flex flex-col gap-1">
          <p className="font-medium">{batch.batchNo} · {batch.target} · {batch.status}</p>
          <p>{t('vinv.export.invoices')}: {batch.invoiceCount} · {money(batch.invoiceTotal)}</p>
          <p>{t('vinv.export.creditNotes')}: {batch.creditNoteCount} · {money(batch.creditTotal)}</p>
          {batch.errorText && <p className="text-red-600">{batch.errorText}</p>}
        </div>
      ) : tab === 'pending' ? (
        pending.isLoading ? <Loading /> : pending.error ? <Alert>{errorText(pending.error, t)}</Alert> : docs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{t('vinv.export.none')}</p>
        ) : (
          <div className="overflow-x-auto max-h-[50vh]">
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
                    <td className="py-1 pr-3 font-mono">{d.documentNo}<div className="text-gray-400">{d.supplierDocNo}</div></td>
                    <td className="py-1 pr-3">{d.supplierName}</td>
                    <td className="py-1 pr-3">{fmtDate(d.documentDate)}</td>
                    <td className="py-1 text-right">{money(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <tr key={b.exportBatchId} className="border-t border-gray-100">
                  <td className="py-1 pr-3 font-mono">{b.batchNo}<div className="text-gray-400">{b.status}</div></td>
                  <td className="py-1 pr-3">{fmtDate(b.exportedAt)}</td>
                  <td className="py-1 pr-3">{b.target}</td>
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
      )}
    </Panel>
  )
}

/** `new?supplier=&branch=&pick=` (from Unbilled): the supplier and that row's lines pre-selected. */
function NewInvoice() {
  const sp = useSearchParams()
  const { current } = useBranchContext()
  const supplier = sp.get('supplier') ?? ''
  const branch = sp.get('branch') ?? current?.branchId ?? ''
  const pick = sp.get('pick')
  const unbilled = useUnbilled({ supplierPartyCode: supplier || undefined, branchId: branch || undefined }, !!pick && !!supplier)
  if (pick && unbilled.isLoading) return <Loading />
  const record = newInvoiceForm(branch, supplier)
  if (pick) record.lines = (unbilled.data ?? []).filter((l) => unbilledKey(l) === pick).map(lineFromUnbilled)
  return <VendorInvoiceFormClient key={`${branch}:${supplier}:${pick}`} record={record} isNew />
}

export function VendorInvoiceView({ id }: { id: string }) {
  const { t } = useT()
  const isNew = id === 'new'
  const inv = useVendorInvoice(isNew ? null : id)
  if (isNew) return <NewInvoice />
  if (inv.isLoading) return <Loading />
  if (inv.error instanceof ApiError && (inv.error.status === 404 || inv.error.status === 400)) notFound()
  if (inv.error || !inv.data) return <Alert>{errorText(inv.error, t)}</Alert>
  return <VendorInvoiceFormClient key={inv.data.rowVersion} record={toFormValues(inv.data)} current={inv.data} isNew={false} />
}
