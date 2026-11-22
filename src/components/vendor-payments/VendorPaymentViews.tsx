'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createColumnHelper } from '@tanstack/react-table'
import { ListPage } from '@/components/shared/ListPage'
import { DataTable } from '@/components/shared/DataTable'
import { FormLayout } from '@/components/shared/FormLayout'
import { ReasonDialog, ToolbarButton } from '@/components/shared/ReasonDialog'
import { SupplierCodeInput } from '@/components/shared/PartyInputs'
import { Alert, Loading, fmtDate, money } from '@/components/docs/DocBits'
import { useT } from '@/i18n/I18nContext'
import {
  PAYMENT_STATUS_TONE, apiPaymentStatus, paymentActions, paymentError, toPaymentRow, usePaymentApproval, useVendorInvoice, useVendorInvoiceAction,
  useVendorInvoices, useVendorPayments, type PaymentRow,
} from '@/lib/api/fleet/vendorInvoices'
import { useFleetAccess } from '@/lib/api/fleet/access'
import { useAuth } from '@/lib/contexts/AuthContext'
import { errorText } from '@/lib/api/errorText'
import { useToastStore } from '@/lib/stores/useToastStore'
import { VendorPaymentFilters } from './VendorPaymentFilters'

const col = createColumnHelper<PaymentRow>()

function StatusBadge({ r }: { r: PaymentRow }) {
  const { t } = useT()
  return (
    <span title={r.rejectReason} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
      {t(`vpay.status.${r.status}`)}
    </span>
  )
}

/** Approve / Reject (reason) on a pending payment (prompt 19 §A); hidden on your own entry. */
function PaymentDecision({ r, variant = 'link' }: { r: PaymentRow; variant?: 'link' | 'button' }) {
  const { t } = useT()
  const toast = useToastStore()
  const { user } = useAuth()
  const { canAnywhere } = useFleetAccess()
  const approval = usePaymentApproval()
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const can = paymentActions(r.dto, canAnywhere('fleet.vendorinvoice.approve'), user?.userId)
  if (!can.approve) return null
  const run = (decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    approval.mutate({ paymentId: r.paymentID, decision, reason }, {
      onSuccess: () => { toast.success(t(`vpay.status.${decision}`), r.documentNo); setRejecting(false) },
      onError: (e) => { setError(errorText(e, t)); if (decision === 'APPROVED') toast.error(t('common.saveFailed'), errorText(e, t)) },
    })
  return (
    <>
      {variant === 'link' ? (
        <>
          <button type="button" disabled={approval.isPending} onClick={() => run('APPROVED')} className="text-xs text-green-700 hover:underline">{t('common.approve')}</button>
          <button type="button" disabled={approval.isPending} onClick={() => { setError(null); setRejecting(true) }} className="text-xs text-red-500 hover:underline">{t('vpay.reject')}</button>
        </>
      ) : (
        <>
          <ToolbarButton tone="danger" disabled={approval.isPending} onClick={() => { setError(null); setRejecting(true) }}>{t('vpay.reject')}</ToolbarButton>
          <ToolbarButton tone="success" disabled={approval.isPending} onClick={() => run('APPROVED')}>{t('common.approve')}</ToolbarButton>
        </>
      )}
      {rejecting && (
        <ReasonDialog title={`${t('vpay.reject')} · ${r.documentNo}`} confirmLabel={t('vpay.reject')} reasonRequired danger busy={approval.isPending} error={error}
          onConfirm={(reason) => run('REJECTED', reason)} onClose={() => setRejecting(false)} />
      )}
    </>
  )
}

/** Same columns; no Delete (a payment is reversed with a negative one). */
function VendorPaymentList({ data }: { data: PaymentRow[] }) {
  const router = useRouter()
  const { t } = useT()
  const open = (r: PaymentRow) => router.push(`/invoice/vendor-payments/${r.paymentID}`)
  const columns = [
    col.display({
      id: 'receipt', header: 'Receipt No / Date',
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => open(r)} className="text-blue-600 hover:underline text-left text-sm font-medium font-mono">{r.receiptNo}</button>
            <span className="text-xs text-gray-400">{fmtDate(r.receiptDate)}</span>
          </div>
        )
      },
    }),
    col.display({
      id: 'vendor', header: () => t('common.vendor'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-900 font-medium">{r.vendorName || '—'}</span>
            <Link href={`/invoice/vendor/${r.vendorInvoiceId}`} className="text-xs text-blue-600 hover:underline font-mono">{r.documentNo} · {r.vendorInvoiceNo}</Link>
          </div>
        )
      },
    }),
    col.display({
      id: 'amount', header: () => t('common.amount'),
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-medium ${r.totalAmount < 0 ? 'text-red-600' : 'text-gray-900'}`}>{money(r.totalAmount)}</span>
            {r.isReversal && <span className="text-xs text-gray-400">{t('vpay.reversal')}</span>}
          </div>
        )
      },
    }),
    col.display({
      id: 'status', header: () => t('common.status'), size: 170,
      cell: (info) => {
        const r = info.row.original
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge r={r} />
            <div className="flex items-center gap-2"><PaymentDecision r={r} /></div>
          </div>
        )
      },
    }),
  ]
  return <DataTable data={data} columns={columns} pageSize={15} />
}

export function VendorPaymentsListView(p: { receiptNo: string; vendorName: string; status: string; dateFrom: string; dateTo: string }) {
  const { t } = useT()
  const { canAnywhere } = useFleetAccess()
  const list = useVendorPayments({
    search: p.receiptNo || p.vendorName || undefined, status: apiPaymentStatus(p.status), from: p.dateFrom || undefined, to: p.dateTo || undefined,
  })
  const rows = (list.data ?? []).map(toPaymentRow)
  return (
    <ListPage
      title={t('nav.vendorPayments')}
      subtitle={`${rows.length} payment${rows.length !== 1 ? 's' : ''} found`}
      actions={canAnywhere('fleet.vendorinvoice.manage') && (
        <Link href="/invoice/vendor-payments/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          + {t('vpay.record')}
        </Link>
      )}
      filters={<VendorPaymentFilters {...p} />}
    >
      {list.isLoading ? <Loading /> : list.error ? <div className="m-4"><Alert>{errorText(list.error, t)}</Alert></div> : <VendorPaymentList data={rows} />}
    </ListPage>
  )
}

const ic = (ro?: boolean, err?: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${err ? 'border-red-400' : ''} ${ro ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'}`

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

/** "Record payment" (prompt 15 §D): an invoice of the supplier with something still to pay; a reversal = negative. */
function RecordPayment() {
  const { t } = useT()
  const router = useRouter()
  const toast = useToastStore()
  const sp = useSearchParams()
  const presetInvoice = sp.get('invoiceId')
  const preset = useVendorInvoice(presetInvoice)
  const [supplier, setSupplier] = useState('')
  const [invoiceId, setInvoiceId] = useState(presetInvoice ?? '')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [ref, setRef] = useState('')
  const [remarks, setRemarks] = useState('')
  const [reverses, setReverses] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const code = (preset.data?.supplierPartyCode ?? supplier).trim().toUpperCase()
  const invoices = useVendorInvoices({ supplierPartyCode: code || undefined }, !!code)
  const payable = (invoices.data ?? []).filter((i) => ['APPROVED', 'EXPORTED', 'PAID'].includes(i.status))
  const inv = payable.find((i) => i.vendorInvoiceId === invoiceId) ?? (preset.data?.vendorInvoiceId === invoiceId ? preset.data : undefined)
  const earlier = useVendorPayments({ vendorInvoiceId: invoiceId || undefined }, !!invoiceId)
  const act = useVendorInvoiceAction()
  const reversal = !!reverses
  const rule = amount ? paymentError(Number(amount), Number(inv?.outstandingAmount ?? 0), reversal) : null

  if (presetInvoice && preset.isLoading) return <Loading />

  const submit = () => {
    if (!inv) return
    setBanner(null)
    act.mutate(
      {
        id: inv.vendorInvoiceId, action: 'payments',
        body: { amount: Number(amount), paidAt: paidAt || null, paymentRef: ref.trim() || null, remarks: remarks.trim() || null, reversesPaymentId: reverses || null, rowVersion: inv.rowVersion },
      },
      { onSuccess: (d) => { toast.success(t('vpay.recorded'), `${d.documentNo} · ${money(amount)}`); router.push('/invoice/vendor-payments') }, onError: (e) => setBanner(errorText(e, t)) },
    )
  }

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {banner && <div className="sm:col-span-2 lg:col-span-3"><Alert>{banner}</Alert></div>}
      <Field label="Vendor Code *">
        {presetInvoice ? <input value={code} disabled className={ic(true)} /> : (
          <SupplierCodeInput id="vpay-suppliers" value={supplier} onChange={(v) => { setSupplier(v); setInvoiceId('') }} className={ic()} placeholder="Supplier code" />
        )}
      </Field>
      <Field label={`${t('vpay.invoice')} *`}>
        <select value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); setReverses('') }} className={ic()} disabled={!!presetInvoice}>
          <option value="">—</option>
          {payable.map((i) => <option key={i.vendorInvoiceId} value={i.vendorInvoiceId}>{i.documentNo} · {i.vendorInvoiceNo} · {t('vinv.outstanding')} {money(i.outstandingAmount)}</option>)}
          {inv && !payable.some((i) => i.vendorInvoiceId === inv.vendorInvoiceId) && <option value={inv.vendorInvoiceId}>{inv.documentNo} · {inv.vendorInvoiceNo}</option>}
        </select>
      </Field>
      <Field label={t('vinv.outstanding')}>
        <input value={inv ? money(inv.outstandingAmount) : ''} disabled className={ic(true)} />
      </Field>
      <Field label={t('vpay.reverses')}>
        <select value={reverses} onChange={(e) => setReverses(e.target.value)} className={ic()} disabled={!invoiceId}>
          <option value="">{t('vpay.notReversal')}</option>
          {(earlier.data ?? []).filter((p) => Number(p.amount) > 0 && (p.status ?? 'APPROVED') === 'APPROVED').map((p) => (
            <option key={p.paymentId} value={p.paymentId}>{fmtDate(p.paidAt)} · {p.paymentRef ?? '—'} · {money(p.amount)}</option>
          ))}
        </select>
      </Field>
      <Field label={`${t('common.amount')} *`} error={rule ? t(rule) : null}>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={ic(false, !!rule)} placeholder={reversal ? '-0.00' : '0.00'} />
      </Field>
      <Field label={`${t('form.date')} *`}>
        <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={ic()} />
      </Field>
      <Field label={t('form.receiptNo')}>
        <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} className={ic()} placeholder={t('vpay.refHint')} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label={t('common.remarks')}>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} maxLength={500} className={`${ic()} resize-none`} />
        </Field>
      </div>
    </div>
  )

  return (
    <FormLayout
      title={t('vpay.record')}
      subtitle={t('vpay.recordHint')}
      tabs={[{ id: 'payment', label: t('common.details'), content }]}
      isNew
      actions={
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => router.back()}>{t('common.cancel')}</ToolbarButton>
          <ToolbarButton tone="primary" disabled={!inv || !amount || !!rule || act.isPending} onClick={submit}>{act.isPending ? t('common.loading') : t('vpay.record')}</ToolbarButton>
        </div>
      }
    />
  )
}

/** A recorded payment (read-only): there is no GET by id, so it is found in the list. */
function PaymentDetail({ id }: { id: string }) {
  const { t } = useT()
  const router = useRouter()
  const list = useVendorPayments({})
  if (list.isLoading) return <Loading />
  if (list.error) return <Alert>{errorText(list.error, t)}</Alert>
  const p = list.data?.find((x) => x.paymentId === id)
  if (!p) return <Alert>{t('vpay.notFound')}</Alert>
  const r = toPaymentRow(p)
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 border-gray-200 min-h-[38px]">{value}</div>
    </div>
  )
  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {row(t('form.receiptNo'), r.receiptNo)}
      {row(t('form.date'), fmtDate(r.receiptDate))}
      {row(t('form.vendor'), `${p.supplierName ?? ''} (${p.supplierPartyCode})`)}
      {row(t('vpay.invoice'), <Link href={`/invoice/vendor/${p.vendorInvoiceId}`} className="text-blue-600 hover:underline font-mono">{p.documentNo} · {p.vendorInvoiceNo}</Link>)}
      {row(t('common.amount'), money(p.amount))}
      {row(t('common.status'), <StatusBadge r={r} />)}
      {p.decidedAt && row(t('vpay.decidedAt'), fmtDate(p.decidedAt))}
      {p.rejectReason && row(t('fuel.rejectReason'), p.rejectReason)}
      {p.reversesPaymentId && row(t('vpay.reversal'), t('vpay.reversalOf'))}
      {row(t('vpay.source'), p.source)}
      {p.remarks && row(t('common.remarks'), p.remarks)}
    </div>
  )
  return (
    <FormLayout
      title={r.receiptNo}
      subtitle={`${p.documentNo} · ${p.supplierName ?? p.supplierPartyCode}`}
      tabs={[{ id: 'payment', label: t('common.details'), content }]}
      isNew={false}
      actions={
        <div className="flex items-center gap-2">
          <PaymentDecision r={r} variant="button" />
          <ToolbarButton onClick={() => router.back()}>{t('common.close')}</ToolbarButton>
        </div>
      }
    />
  )
}

export function VendorPaymentView({ id }: { id: string }) {
  return id === 'new' ? <RecordPayment /> : <PaymentDetail id={id} />
}
