'use client'

import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { ListPage } from '@/components/shared/ListPage'
import { Panel } from '@/components/fleet-setup/ui'
import { Alert, Loading, StatusPill, fmtDate, money } from '@/components/docs/DocBits'
import { WOInvoiceFilters } from '@/components/wo-invoices/WOInvoiceFilters'
import { useT } from '@/i18n/I18nContext'
import { errorText } from '@/lib/api/errorText'
import { viewInvoiceStatus } from '@/lib/api/platform/fleetInvoices'
import { subconQuery, useSubconInvoice, useSubconInvoices, type SubconDeductionInvoiceDto } from '@/lib/api/platform/subconDeductionInvoices'

const col = createColumnHelper<SubconDeductionInvoiceDto>()
const STATUS_CLASS = { ACTIVE: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
const pill = (s: string) => { const v = viewInvoiceStatus(s); return <StatusPill view={v} api={s} className={STATUS_CLASS[v]} /> }

/**
 * WO invoice page, Source = Subcontractor deductions (owner-approved 2026-11-22, prompt 23): SCT tax invoices issued
 * automatically when Trucking marks a subcontractor statement PAID. Read-only; corrections are credit notes (prompt 21).
 */
export function SubconDeductionList(p: { receiptNo: string; customerName: string; status: string; dateFrom: string; dateTo: string; source: string }) {
  const { t } = useT()
  const list = useSubconInvoices(subconQuery(p), true)
  const [open, setOpen] = useState<string | null>(null)
  const rows = (list.data ?? []).filter((d) => p.status === 'ALL' || viewInvoiceStatus(d.status) === p.status)
  const columns = [
    col.display({
      id: 'no', header: 'Receipt No / Date',
      cell: ({ row: { original: d } }) => (
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => setOpen(d.invoiceId)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.invoiceNo}</button>
          <span className="text-xs text-gray-400">{fmtDate(d.settledAt)}</span>
        </div>
      ),
    }),
    col.display({
      id: 'sub', header: () => t('woInvoice.subcontractor'),
      cell: ({ row: { original: d } }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{d.subconName ?? d.subconPartyCode}</span>
          <span className="text-xs text-gray-400 font-mono">{d.subconPartyCode} · {d.settlementNo}</span>
        </div>
      ),
    }),
    col.display({
      id: 'amt', header: () => t('common.amount'),
      cell: ({ row: { original: d } }) => (
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-sm font-semibold">{money(d.totalAmount)}</span>
          <span className="text-xs text-gray-400">Nett {money(d.subtotalAmount)} · VAT {money(d.taxAmount)}</span>
        </div>
      ),
    }),
    col.display({
      id: 'status', header: () => t('common.status'), size: 120,
      cell: ({ row: { original: d } }) => (
        <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => setOpen(d.invoiceId)} className="text-xs text-blue-600 hover:underline text-left">{t('common.view')}</button></div>
      ),
    }),
  ]
  return (
    <ListPage
      title={t('nav.woInvoices')}
      subtitle={`${rows.length} ${t('woInvoice.subconCount')}`}
      filters={<WOInvoiceFilters receiptNo={p.receiptNo} customerName={p.customerName} status={p.status} dateFrom={p.dateFrom} dateTo={p.dateTo} source={p.source} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : (
        <>
          <p className="px-4 pt-3 text-xs text-gray-500">{t('woInvoice.subconHint')}</p>
          <DataTable data={rows} columns={columns} pageSize={15} />
        </>
      )}
      {open && <SubconDeductionDrawer id={open} onClose={() => setOpen(null)} />}
    </ListPage>
  )
}

function SubconDeductionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useT()
  const inv = useSubconInvoice(id)
  const d = inv.data
  return (
    <Panel open title={d ? `${d.invoiceNo} · ${d.subconName ?? d.subconPartyCode}` : t('common.loading')} onClose={onClose} footer={<div />}>
      {inv.isLoading ? <Loading /> : inv.error || !d ? <Alert>{errorText(inv.error, t)}</Alert> : (
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-500">{t('woInvoice.settlement')}</p><p className="font-mono">{d.settlementNo}</p></div>
            <div><p className="text-xs text-gray-500">{t('woInvoice.paidOn')}</p><p>{fmtDate(d.settledAt)}</p></div>
            <div><p className="text-xs text-gray-500">{t('common.status')}</p>{pill(d.status)}</div>
            <div><p className="text-xs text-gray-500">{t('woInvoice.issuedAt')}</p><p>{fmtDate(d.issuedAt)}</p></div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr className="text-left">
                  <th className="px-2 py-1.5">WO No</th><th className="px-2 py-1.5">{t('woInvoice.vehicle')}</th><th className="px-2 py-1.5">{t('woInvoice.recharge')}</th>
                  <th className="px-2 py-1.5">{t('woInvoice.charge')}</th><th className="px-2 py-1.5 text-right">Amount</th><th className="px-2 py-1.5 text-right">VAT</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((l) => (
                  <tr key={l.invoiceLineId} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 font-mono">{l.workOrderNo ?? '—'}</td>
                    <td className="px-2 py-1.5 font-mono">{l.vehicleCode ?? '—'}</td>
                    <td className="px-2 py-1.5 font-mono">{l.rechargeNo ?? '—'}</td>
                    <td className="px-2 py-1.5">{l.chargeName ?? l.chargeCode}<div className="text-gray-400">{l.sourceLineType ?? ''}</div></td>
                    <td className="px-2 py-1.5 text-right">{money(l.amount)}</td>
                    <td className="px-2 py-1.5 text-right">{money(l.taxAmount)}<div className="text-gray-400">{Number(l.taxRate)}%</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right border-t pt-2">
            <div><p className="text-xs text-gray-500">Net</p><p>{money(d.subtotalAmount)}</p></div>
            <div><p className="text-xs text-gray-500">VAT</p><p>{money(d.taxAmount)}</p></div>
            <div><p className="text-xs text-gray-500">Total</p><p className="font-semibold">{money(d.totalAmount)}</p></div>
          </div>
          <p className="text-xs text-gray-500">{t('woInvoice.subconCorrect')}</p>
        </div>
      )}
    </Panel>
  )
}
