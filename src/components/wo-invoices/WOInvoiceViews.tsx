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
import { Alert, Loading, StatusPill, fmtDate, money, num, useSaveFailure } from '@/components/docs/DocBits'
import { WOInvoiceFilters } from '@/components/wo-invoices/WOInvoiceFilters'
import { useT } from '@/i18n/I18nContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { errorText } from '@/lib/api/errorText'
import { useBranchContext } from '@/lib/api/platform/branches'
import { useToastStore } from '@/lib/stores/useToastStore'
import {
  partyAddress, toInvoiceLines, useFleetCharges, useFleetInvoice, useFleetInvoices, useInvoiceable, useIssueFleetInvoice, useParty, viewInvoiceStatus,
  type FleetInvoiceDto, type FleetInvoiceable, type InvoiceLineView,
} from '@/lib/api/platform/fleetInvoices'

const BASE = '/invoice/work-order'
const col = createColumnHelper<FleetInvoiceDto>()
const lcol = createColumnHelper<InvoiceLineView>()
const STATUS_CLASS = { ACTIVE: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
const pill = (s: string) => { const v = viewInvoiceStatus(s); return <StatusPill view={v} api={s} className={STATUS_CLASS[v]} /> }

export function WOInvoicesListView(p: { receiptNo: string; customerName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const router = useRouter()
  const { canAtBranch } = useAuth()
  const { currentBranchId } = useBranchContext()
  const list = useFleetInvoices({ branchId: currentBranchId ?? undefined, search: p.receiptNo.trim() || p.customerName.trim() || undefined, status: p.status === 'ALL' ? undefined : p.status === 'ACTIVE' ? 'ISSUED' : p.status, from: p.dateFrom || undefined, to: p.dateTo || undefined })
  // search / status / from / to are the API's (backend #14). The API has one `search`: with both boxes filled the customer
  // is still matched here.
  const no = p.receiptNo.trim()
  const cust = p.customerName.trim().toUpperCase()
  const rows = (list.data ?? []).filter((d) =>
    (!no || !cust || (d.payerPartyCode ?? '').toUpperCase().includes(cust) || (d.payerName ?? '').toUpperCase().includes(cust)) &&
    (p.status === 'ALL' || viewInvoiceStatus(d.status) === p.status))
  const open = (d: FleetInvoiceDto) => router.push(`${BASE}/${d.invoiceId}`)
  const columns = [
    col.display({ id: 'no', header: 'Receipt No / Date', cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><button type="button" onClick={() => open(d)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{d.invoiceNo}</button><span className="text-xs text-gray-400">{fmtDate(d.issuedAt)}</span></div> }),
    col.display({ id: 'cust', header: () => t('common.customer'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5"><span className="text-sm font-medium">{d.payerName ?? d.payerPartyCode}</span><span className="text-xs text-gray-400 font-mono">{d.payerPartyCode} · {d.paymentTermCode}</span></div> }),
    col.display({ id: 'amt', header: () => t('common.amount'), cell: ({ row: { original: d } }) => <div className="flex flex-col gap-0.5 text-right"><span className="text-sm font-semibold">{money(d.totalAmount)}</span><span className="text-xs text-gray-400">Nett {money(d.subtotalAmount)} · VAT {money(d.taxAmount)}</span></div> }),
    col.display({ id: 'status', header: () => t('common.status'), size: 120, cell: ({ row: { original: d } }) => <div className="flex flex-col gap-1">{pill(d.status)}<button type="button" onClick={() => open(d)} className="text-xs text-blue-600 hover:underline text-left">{t('common.view')}</button></div> }),
  ]
  return (
    <ListPage
      title={t('nav.woInvoices')}
      subtitle={`${rows.length} WO invoice${rows.length !== 1 ? 's' : ''} found`}
      actions={canAtBranch('revenue.invoice.issue', currentBranchId) && <Link href={`${BASE}/new`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">+ {t('nav.woInvoices')}</Link>}
      filters={<WOInvoiceFilters receiptNo={p.receiptNo} customerName={p.customerName} status={p.status} dateFrom={p.dateFrom} dateTo={p.dateTo} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <DataTable data={rows} columns={columns} pageSize={15} />}
    </ListPage>
  )
}

export function WOInvoiceView({ id }: { id: string }) {
  if (id === 'new') return <NewInvoice />
  return <InvoiceDetail id={id} />
}

const lineColumns = [
  lcol.accessor('workOrderNo', { header: 'WO No', cell: (i) => <span className="font-mono text-sm">{i.getValue() || '—'}</span> }),
  lcol.accessor('serviceType', { header: 'Service Type', cell: (i) => <span className="text-xs">{i.getValue() || '—'}</span> }),
  lcol.display({ id: 'charge', header: 'Charge Code', cell: ({ row: { original: l } }) => <div className="flex flex-col"><span className="font-mono text-sm">{l.chargeCode}</span><span className="text-xs text-gray-500">{l.chargeName}</span></div> }),
  lcol.accessor('transactionType', { header: 'Transaction', cell: (i) => <span className="text-xs font-mono">{i.getValue() || '—'}</span> }),
  lcol.accessor('equipmentCode', { header: 'Equipment', cell: (i) => <span className="text-sm font-mono">{i.getValue() || '—'}</span> }),
  lcol.accessor('quantity', { header: 'Qty', cell: (i) => <span className="tabular-nums">{i.getValue()}</span> }),
  lcol.accessor('unitPrice', { header: 'Unit Price', cell: (i) => <span className="tabular-nums">{money(i.getValue())}</span> }),
  lcol.accessor('totalAmount', { header: 'Total', cell: (i) => <span className="tabular-nums font-medium">{money(i.getValue())}</span> }),
  lcol.accessor('stockType', { header: 'Stock Type', cell: (i) => <span className="text-xs font-mono">{i.getValue() || '—'}</span> }),
]

function InvoiceDetail({ id }: { id: string }) {
  const { t } = useT()
  const router = useRouter()
  const inv = useFleetInvoice(id)
  const d = inv.data
  const party = useParty(d?.payerPartyCode ?? null)
  if (inv.isLoading) return <Loading />
  if (!d) return inv.error ? <Alert>{errorText(inv.error, t)}</Alert> : <p className="text-sm text-red-600">Not found.</p>
  const lines = toInvoiceLines(d.lines)
  const ro = (v: string) => <input readOnly value={v} placeholder="—" className={inputClass(false, true)} />
  const header = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label={`${t('form.receiptNo')} *`}>{ro(d.invoiceNo)}</Field>
        <Field label={`${t('form.date')} *`}>{ro(fmtDate(d.issuedAt))}</Field>
        <Field label={t('form.customer')}>{ro(d.payerName ?? '')}</Field>
        <Field label="Customer Code">{ro(d.payerPartyCode ?? '')}</Field>
        <Field label="Credit Term">{ro(d.paymentTermCode)}</Field>
        <Field label="Work Order Discount (%)">{ro('0')}</Field>
        <Field label="VAT (%)">{ro(String(d.lines[0] ? num(d.lines[0].taxRate) : 7))}</Field>
        <Field label={t('common.status')}><div className="pt-1">{pill(d.status)}</div></Field>
        <div className="sm:col-span-2 lg:col-span-3"><Field label={t('form.address')}><textarea readOnly rows={2} value={partyAddress(party.data)} className={`${inputClass(false, true)} resize-none`} /></Field></div>
        <div className="sm:col-span-2 lg:col-span-3"><Field label={t('common.remarks')}><textarea readOnly rows={2} value={d.remarks ?? ''} className={`${inputClass(false, true)} resize-none`} /></Field></div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-3 gap-4">
        <div><p className="text-xs text-gray-500">Nett Amount</p><p className="text-sm font-medium">{money(d.subtotalAmount)}</p></div>
        <div><p className="text-xs text-gray-500">VAT Amount</p><p className="text-sm font-medium">{money(d.taxAmount)}</p></div>
        <div><p className="text-xs text-gray-500">Total Amount</p><p className="text-base font-bold">{money(d.totalAmount)}</p></div>
      </div>
    </div>
  )
  return (
    <FormLayout
      title={d.invoiceNo}
      subtitle={d.payerName ?? d.payerPartyCode ?? undefined}
      tabs={[
        { id: 'header', label: t('form.header'), content: header },
        { id: 'lines', label: `${t('form.lineItems')} (${d.lines.length})`, content: <DataTable data={lines} columns={lineColumns} pageSize={50} /> },
      ]}
      actions={<ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>}
    />
  )
}

/** "New invoice": pick an invoiceable payer, optionally tick charges, issue (no draft) → open it. */
function NewInvoice() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const failure = useSaveFailure()
  const { canAtBranch } = useAuth()
  const { currentBranchId } = useBranchContext()
  const invoiceable = useInvoiceable(currentBranchId ?? null)
  const issue = useIssueFleetInvoice()
  const [payer, setPayer] = useState<FleetInvoiceable | null>(null)
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const ready = useFleetCharges({ branchId: payer?.branchId, payerPartyCode: payer?.payerPartyCode, status: 'READY' }, !!payer)
  const charges = ready.data ?? []
  const chosen = picked ?? new Set(charges.map((c) => c.fleetChargeId))
  const toggle = (id: string) => setPicked(() => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const amount = charges.filter((c) => chosen.has(c.fleetChargeId)).reduce((s, c) => s + num(c.amount), 0)

  const submit = async () => {
    if (!payer) return
    setBanner(null)
    if (!chosen.size) { setBanner(t('woInvoice.pickCharges')); return }
    try {
      const all = chosen.size === charges.length
      const inv = await issue.mutateAsync({
        branchId: payer.branchId, payerPartyCode: payer.payerPartyCode, fleetChargeIds: all ? null : [...chosen],
        invoiceDate: invoiceDate || null, remarks: remarks.trim() || null,
      })
      toast.success(t('woInvoice.issued'), inv.invoiceNo)
      router.push(`${BASE}/${inv.invoiceId}`)
    } catch (e) {
      setBanner(failure(e))
    }
  }

  const content = (
    <div className="flex flex-col gap-4">
      {banner && <Alert>{banner}</Alert>}
      <p className="text-sm text-gray-600">{t('woInvoice.pickPayer')}</p>
      {invoiceable.isLoading ? <Loading /> : invoiceable.error ? <Alert>{errorText(invoiceable.error, t)}</Alert> : !invoiceable.data?.length ? <p className="text-sm text-gray-500">{t('woInvoice.nothing')}</p> : (
        <table className="w-full text-sm border border-gray-200 rounded-lg">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left"><th className="px-3 py-2 w-8" /><th className="px-3 py-2">{t('common.customer')}</th><th className="px-3 py-2 text-right">{t('docs.lines')}</th><th className="px-3 py-2 text-right">WO</th><th className="px-3 py-2 text-right">{t('common.amount')}</th><th className="px-3 py-2 text-right">VAT</th><th className="px-3 py-2">{t('woInvoice.oldest')}</th></tr></thead>
          <tbody>
            {invoiceable.data.map((r) => (
              <tr key={`${r.branchId}-${r.payerPartyCode}`} onClick={() => { setPayer(r); setPicked(null) }} className={`border-t border-gray-100 cursor-pointer ${payer?.payerPartyCode === r.payerPartyCode && payer.branchId === r.branchId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <td className="px-3 py-2"><input type="radio" readOnly aria-label={r.payerPartyCode} checked={payer?.payerPartyCode === r.payerPartyCode && payer.branchId === r.branchId} /></td>
                <td className="px-3 py-2"><span className="font-medium">{r.payerName ?? r.payerPartyCode}</span> <span className="text-xs font-mono text-gray-500">{r.payerPartyCode}</span></td>
                <td className="px-3 py-2 text-right">{num(r.lines)}</td><td className="px-3 py-2 text-right">{num(r.workOrders)}</td>
                <td className="px-3 py-2 text-right">{money(r.amount)}</td><td className="px-3 py-2 text-right">{money(r.taxAmount)}</td><td className="px-3 py-2">{fmtDate(r.oldestPricedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {payer && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={t('form.date')}><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass()} /></Field>
            <div className="sm:col-span-2"><Field label={t('common.remarks')}><input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass()} /></Field></div>
          </div>
          {ready.isLoading ? <Loading /> : (
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left"><th className="px-3 py-2 w-8"><input type="checkbox" aria-label="all" checked={chosen.size === charges.length && charges.length > 0} onChange={(e) => setPicked(e.target.checked ? new Set(charges.map((c) => c.fleetChargeId)) : new Set())} /></th><th className="px-3 py-2">WO No</th><th className="px-3 py-2">Recharge</th><th className="px-3 py-2">Equipment</th><th className="px-3 py-2">Charge</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">{t('common.amount')}</th></tr></thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.fleetChargeId} className="border-t border-gray-100 cursor-pointer hover:bg-gray-50" onClick={() => toggle(c.fleetChargeId)}>
                    <td className="px-3 py-1.5"><input type="checkbox" aria-label={c.chargeCode} checked={chosen.has(c.fleetChargeId)} onChange={() => toggle(c.fleetChargeId)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="px-3 py-1.5 font-mono">{c.workOrderNo}</td><td className="px-3 py-1.5 font-mono text-xs">{c.rechargeNo}</td><td className="px-3 py-1.5 font-mono">{c.assetCode ?? '—'}</td>
                    <td className="px-3 py-1.5"><span className="font-mono">{c.chargeCode}</span> <span className="text-xs text-gray-500">{c.chargeName}</span></td>
                    <td className="px-3 py-1.5 text-right">{num(c.quantity)}</td><td className="px-3 py-1.5 text-right">{money(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-sm text-right">{t('woInvoice.selected')}: <span className="font-semibold">{chosen.size}</span> · {money(amount)} <span className="text-xs text-gray-500">({t('woInvoice.beforeVat')})</span></p>
        </div>
      )}
    </div>
  )
  return (
    <FormLayout
      title={`${t('common.new')} ${t('nav.woInvoices')}`}
      tabs={[{ id: 'new', label: t('woInvoice.toInvoice'), content }]}
      isNew
      actions={
        <div className="flex gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
          {canAtBranch('revenue.invoice.issue', payer?.branchId ?? currentBranchId) && <ToolbarButton tone="primary" disabled={!payer || issue.isPending || !chosen.size} onClick={submit}>{issue.isPending ? t('common.loading') : t('woInvoice.issue')}</ToolbarButton>}
        </div>
      }
    />
  )
}
